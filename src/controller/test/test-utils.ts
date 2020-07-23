import { Setting } from '../../domain/entity/setting.entity';
import { EntityManager, getConnection } from 'typeorm';
import { SettingRepository } from '../../dao/setting.repository';
import { Some } from 'optional-typescript';
import { ISendMailOptions } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';
import { SignUpDto } from '../../dto/auth/request/sign-up.dto';
import { AuthenticationService } from '../../service/authentication.service';
import * as faker from 'faker';
import { LoginDto } from '../../dto/auth/request/login.dto';
import { AssociationTypeConstant } from '../../domain/enums/association-type-constant';
import { GenericStatusConstant } from '../../domain/enums/generic-status-constant';
import { PortalUser } from '../../domain/entity/portal-user.entity';
import { factory } from './factory';
import { Association } from '../../domain/entity/association.entity';
import { PortalAccount } from '../../domain/entity/portal-account.entity';
import { PortalUserAccount } from '../../domain/entity/portal-user-account.entity';


export const init = async (entityManager?: EntityManager) => {

  const setting = await getConnection().getCustomRepository(SettingRepository).findOneItemByStatus({
    label: 'trusted_ip_address',
  });

  await Some(setting).valueOrAsync(() => {
    const newSetting = new Setting();
    newSetting.label = 'trusted_ip_address';
    newSetting.value = '::ffff:127.0.0.1';
    return getConnection().transaction(async entityManager => {
      return await entityManager.save(newSetting);
    });
  });

};


export const mockLoginUser = async function(authenticationService: AuthenticationService) {
  const signUpUser = await this.mockActiveSignUpUser(authenticationService);
  const loginDto = new LoginDto();
  loginDto.username = signUpUser.username;
  loginDto.password = signUpUser.password;
  return await authenticationService.loginUser(loginDto);
};

export const mockNewSignUpUser = async (authenticationService: AuthenticationService): Promise<SignUpDto> => {


  const newUser: SignUpDto = {
    associationName: faker.name.lastName() + ' Association',
    email: faker.internet.email(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    password: faker.random.uuid(),
    phoneNumber: faker.phone.phoneNumber(),
    associationType: faker.random.arrayElement(Object.values(AssociationTypeConstant)),
  };

  const membership = await authenticationService.signPrincipalUser(newUser);
  const portalAccount = membership.portalAccount;
  const portalUser = membership.portalUser;
  portalUser.status = portalAccount.status = membership.status = GenericStatusConstant.ACTIVE;
  await getConnection().transaction(async entityManager => {
    await entityManager.save(portalAccount);
    await entityManager.save(portalUser);
    await entityManager.save(membership);
  });


  return newUser;
};

export const getUserByStatus = async (status: GenericStatusConstant) => {
  const association = await factory().upset(Association).use(association => {
    association.status = status;
    return association;
  }).create();
  const portalAccount = await factory().upset(PortalAccount).use(portalAccount => {
    portalAccount.status = status;
    return portalAccount;
  }).create();
  const portalUser = await factory().upset(PortalUser).use(portalUser => {
    portalUser.status = status;
    return portalUser;
  }).create();
  return await (factory().upset(PortalUserAccount).use(portalUserAccount => {
    portalUserAccount.portalAccount = portalAccount;
    portalUserAccount.portalUser = portalUser;
    portalUserAccount.status = status;
    portalUserAccount.association = association;
    return portalUserAccount;
  }).create());

};

export const getLoginUser = async (authenticationService: AuthenticationService): Promise<string> => {

  const portalUser = await mockNewSignUpUser(authenticationService);
  return authenticationService.loginUser({
    username: portalUser.email,
    password: portalUser.password,
  });

};


export const mockSendEmail = () => jest.fn().mockImplementation((sendEmailOptions: ISendMailOptions) => {
  return Promise.resolve('Email has been sent successfully');
});