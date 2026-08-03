import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

const WORK_MODES = ['planta', 'campo', 'hibrido'];

/**
 * Employee — raíz de agregado del contexto attendance. Encapsula las
 * invariantes del empleado (clave única, modo de trabajo válido) y los datos
 * biométricos de enrolamiento facial. La autenticación por código+PIN vive en
 * el servicio identity, que lee esta misma tabla.
 */
export class Employee extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.code = props.code ? String(props.code).toUpperCase() : props.code;
    this.noiKey = props.noiKey || props.code || null;
    this.name = props.name;
    this.rfc = props.rfc || null;
    this.department = props.department || null;
    this.position = props.position || null;
    this.scheduleId = props.scheduleId ?? null;
    this.deviceId = props.deviceId ?? null;
    this.checadorUserId = props.checadorUserId || null;
    this.pinHash = props.pinHash ?? null;
    this.dailySalary = Number(props.dailySalary) || 0;
    this.hireDate = props.hireDate || null;
    this.bonusEligible = props.bonusEligible ?? true;
    this.workMode = props.workMode || 'planta';
    this.appProfile = props.appProfile || null;
    this.allowedSiteIds = props.allowedSiteIds || [];
    this.faceDescriptor = props.faceDescriptor ?? null;
    this.facePhoto = props.facePhoto ?? null;
    this.active = props.active ?? true;
    this.extraModules = props.extraModules || [];
    this.revokedModules = props.revokedModules || [];
    this.portalExtraModules = props.portalExtraModules || [];
    this.portalRevokedModules = props.portalRevokedModules || [];
  }

  static create(props) {
    if (!props.name) throw new DomainError('El nombre es obligatorio', { code: 'EMP_NAME_REQUIRED' });
    if (!props.code) throw new DomainError('La clave es obligatoria', { code: 'EMP_CODE_REQUIRED' });
    if (props.workMode && !WORK_MODES.includes(props.workMode)) {
      throw new DomainError(`Modo de trabajo inválido: ${props.workMode}`, { code: 'EMP_WORKMODE_INVALID' });
    }
    const emp = new Employee(props);
    emp.addDomainEvent(new DomainEvent('EmployeeCreated', { code: emp.code, name: emp.name }));
    return emp;
  }

  /** Enrolamiento biométrico (rostro): 128 flotantes. */
  enrollFace(descriptor, photo = null) {
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      throw new DomainError('Descriptor facial inválido (se esperan 128 valores)', { code: 'FACE_DESCRIPTOR_INVALID' });
    }
    this.faceDescriptor = descriptor.map(Number);
    this.facePhoto = typeof photo === 'string' ? photo : null;
  }

  unenrollFace() {
    this.faceDescriptor = null;
    this.facePhoto = null;
  }

  deactivate() {
    this.active = false;
  }

  get faceEnrolled() {
    return Array.isArray(this.faceDescriptor) && this.faceDescriptor.length === 128;
  }

  toPlain() {
    return {
      id: this.id,
      code: this.code,
      noiKey: this.noiKey,
      name: this.name,
      rfc: this.rfc,
      department: this.department,
      position: this.position,
      scheduleId: this.scheduleId,
      deviceId: this.deviceId,
      checadorUserId: this.checadorUserId,
      pinHash: this.pinHash,
      dailySalary: this.dailySalary,
      hireDate: this.hireDate,
      bonusEligible: this.bonusEligible,
      workMode: this.workMode,
      appProfile: this.appProfile,
      allowedSiteIds: this.allowedSiteIds,
      faceDescriptor: this.faceDescriptor,
      facePhoto: this.facePhoto,
      active: this.active,
      extraModules: this.extraModules,
      revokedModules: this.revokedModules,
      portalExtraModules: this.portalExtraModules,
      portalRevokedModules: this.portalRevokedModules,
    };
  }

  /** Vista pública: omite datos biométricos pesados y el hash del PIN. */
  toPublic() {
    const { faceDescriptor, facePhoto, pinHash, ...rest } = this.toPlain();
    return { ...rest, faceEnrolled: this.faceEnrolled };
  }
}

export { WORK_MODES };
