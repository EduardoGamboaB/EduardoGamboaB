import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

const VALID_ROLES = ['admin', 'contador', 'nomina', 'comercial', 'produccion', 'direccion'];

/**
 * User — raíz de agregado del contexto identity. Encapsula las invariantes de
 * un usuario administrativo (rol válido, no auto-desactivación, etc.).
 */
export class User extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.name = props.name;
    this.email = String(props.email || '').toLowerCase();
    this.role = props.role || 'comercial';
    this.position = props.position || null;
    this.passwordHash = props.passwordHash;
    this.active = props.active ?? true;
    this.extraModules = props.extraModules || [];
    this.revokedModules = props.revokedModules || [];
  }

  static create(props) {
    if (!props.name) throw new DomainError('El nombre es obligatorio', { code: 'USER_NAME_REQUIRED' });
    if (!props.email) throw new DomainError('El correo es obligatorio', { code: 'USER_EMAIL_REQUIRED' });
    if (props.role && !VALID_ROLES.includes(props.role)) {
      throw new DomainError(`Rol inválido: ${props.role}`, { code: 'USER_ROLE_INVALID' });
    }
    const user = new User(props);
    user.addDomainEvent(new DomainEvent('UserCreated', { email: user.email, role: user.role }));
    return user;
  }

  changeRole(role) {
    if (!VALID_ROLES.includes(role)) {
      throw new DomainError(`Rol inválido: ${role}`, { code: 'USER_ROLE_INVALID' });
    }
    this.role = role;
  }

  deactivate() {
    this.active = false;
  }

  get isAdmin() {
    return this.role === 'admin';
  }

  toPlain() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      position: this.position,
      passwordHash: this.passwordHash,
      active: this.active,
      extraModules: this.extraModules,
      revokedModules: this.revokedModules,
    };
  }

  toPublic() {
    const { passwordHash, ...rest } = this.toPlain();
    return rest;
  }
}

export { VALID_ROLES };
