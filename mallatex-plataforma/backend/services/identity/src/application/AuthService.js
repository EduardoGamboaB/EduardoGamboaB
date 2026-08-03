import { signToken, hashSecret, verifySecret } from '@mallatex/shared/auth';
import { DomainError } from '@mallatex/shared/ddd';
import { User } from '../domain/User.js';

/**
 * AuthService — casos de uso de autenticación. Emite un JWT que ya transporta
 * los módulos efectivos, de modo que gateway y servicios autorizan sin
 * reconsultar la matriz.
 */
export class AuthService {
  constructor({ userDAO, employeeDAO, accessService }) {
    this.userDAO = userDAO;
    this.employeeDAO = employeeDAO;
    this.accessService = accessService;
  }

  /** Login de usuario administrativo (email + password). */
  async loginAdmin(email, password) {
    const user = await this.userDAO.findByEmail(email);
    if (!user || !user.active) throw new DomainError('Credenciales inválidas', { code: 'AUTH_INVALID', status: 401 });
    const ok = await verifySecret(password, user.passwordHash);
    if (!ok) throw new DomainError('Credenciales inválidas', { code: 'AUTH_INVALID', status: 401 });

    const modules = await this.accessService.webModulesForUser(user);
    const token = signToken({
      sub: String(user.id),
      principal: 'admin',
      role: user.role,
      name: user.name,
      email: user.email,
      modules,
    });
    return { token, user: user.toPublic(), modules };
  }

  /** Login de empleado (código + PIN) — móvil y portal. */
  async loginEmployee(code, pin) {
    const emp = await this.employeeDAO.findOne({ code: String(code).toUpperCase() });
    if (!emp || !emp.active) throw new DomainError('Credenciales inválidas', { code: 'AUTH_INVALID', status: 401 });
    const ok = await verifySecret(pin, emp.pinHash);
    if (!ok) throw new DomainError('Credenciales inválidas', { code: 'AUTH_INVALID', status: 401 });

    const [mobile, portal] = await Promise.all([
      this.accessService.modulesForEmployee(emp, 'mobile'),
      this.accessService.modulesForEmployee(emp, 'portal'),
    ]);
    const token = signToken({
      sub: String(emp.id),
      principal: 'employee',
      profile: emp.appProfile || 'operativo',
      code: emp.code,
      name: emp.name,
      modules: mobile,
      portalModules: portal,
    });
    return {
      token,
      employee: { id: emp.id, code: emp.code, name: emp.name, profile: emp.appProfile || 'operativo' },
      modules: mobile,
      portalModules: portal,
    };
  }

  async createUser(data) {
    const passwordHash = await hashSecret(data.password || 'mallatex2026');
    const user = User.create({ ...data, passwordHash });
    return this.userDAO.create(user);
  }
}
