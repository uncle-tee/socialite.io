import { INestApplication } from '@nestjs/common';
import { Connection } from 'typeorm/connection/Connection';
import { AuthenticationService } from '../service-impl/authentication.service';
import { IEmailValidationService } from '../contracts/i-email-validation-service';
import { PortalUser } from '../domain/entity/portal-user.entity';
import { PortalAccount } from '../domain/entity/portal-account.entity';
import { TestingModule } from '@nestjs/testing';
import { ServiceImplModule } from '../service-impl/service-Impl.module';
import { baseTestingModule, getLoginUser } from './test-utils';
import { getConnection } from 'typeorm';
import { TokenPayloadDto } from '../dto/token-payload.dto';
import * as request from 'supertest';
import { AssociationRequestDto } from '../dto/association/association-request.dto';
import * as faker from 'faker';
import { factory } from './factory';
import { Country } from '../domain/entity/country.entity';
import { AssociationTypeConstant } from '../domain/enums/association-type-constant';
import { Association } from '../domain/entity/association.entity';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import { ValidatorTransformPipe } from '../conf/validator-transform.pipe';
import { Bank } from '../domain/entity/bank.entity';
import { AssociationServiceImpl } from '../service-impl/association.service-impl';
import { ServiceModule } from '../service/service.module';
import { CACHE_ASSOCIATION_SERVICE } from '../service/association-service';
import { WalletRepository } from '../dao/wallet.repository';
import { Wallet } from '../domain/entity/wallet.entity';

async function associationUpdate(loginToken: string) {
  let association = await factory().upset(Association).use(association => {
    association.status = GenericStatusConstant.PENDING_ACTIVATION;
    return association;
  }).create();
  let portalUser = await factory().create(PortalUser);
  loginToken = (await getLoginUser(null, portalUser, association)).token;
  let payload: AssociationRequestDto = {
    activateAssociation: 'false',
    address: {
      address: faker.address.streetAddress(),
      countryCode: (await factory().create(Country)).code,
    },
    bankInfo: {
      accountNumber: faker.finance.iban(),
      bankCode: (await factory().create(Bank)).code,
    },
    name: faker.name.lastName() + ' association',
    type: faker.random.arrayElement(Object.values(AssociationTypeConstant)),
  };
  return { loginToken, payload, portalUser, association };
}

describe('AssociationController', () => {
  let applicationContext: INestApplication;
  let connection: Connection;
  let authenticationService: AuthenticationService;
  let loginToken: string;
  let emailValidationService: IEmailValidationService<PortalUser, PortalAccount, TokenPayloadDto>;
  let associationService: AssociationServiceImpl;


  beforeAll(async () => {
    const moduleRef: TestingModule = await baseTestingModule().compile();
    applicationContext = moduleRef.createNestApplication();
    applicationContext.useGlobalPipes(new ValidatorTransformPipe());
    await applicationContext.init();

    connection = getConnection();
    authenticationService = applicationContext
      .select(ServiceImplModule)
      .get(AuthenticationService, { strict: true });
    associationService = applicationContext
      .select(ServiceModule)
      .get(CACHE_ASSOCIATION_SERVICE, { strict: true });
    emailValidationService = applicationContext.select(ServiceModule).get('EMAIL_VALIDATION_SERVICE', { strict: true });


  });


  it('Test that a login user should be able continue updating his association', async () => {
    const __ret = await associationUpdate(loginToken);
    loginToken = __ret.loginToken;
    let payload = __ret.payload;

    let response = await request(applicationContext.getHttpServer())
      .put('/associations/onboard')
      .set('Authorization', loginToken)
      .send(payload);
    expect(response.status).toEqual(201);

  });


  it('Test that a created association can create its wallet', async () => {
    let assoc = await associationUpdate(loginToken);
    await associationService.createAssociation(assoc.payload, {
      association: assoc.association, portalUser: assoc.portalUser,
    });
    loginToken = assoc.loginToken;
    let payload = assoc.payload;
    payload.activateAssociation = 'true';
    let response = await request(applicationContext.getHttpServer())
      .put('/associations/onboard')
      .set('Authorization', loginToken)
      .send(payload);
    await connection.getCustomRepository(WalletRepository).findByAssociation(assoc.association).then(wallets => {
      expect(wallets.length).toEqual(1);
      let wallet = wallets[0];
      expect(wallet.reference).toBeDefined();
      expect(0).toEqual(Number(wallet.bookBalance));
      expect(0).toEqual(Number(wallet.availableBalance));

    });
  });


  it('Test that updating of association creates right records', async () => {
    const __ret = await associationUpdate(loginToken);

    await associationService.createAssociation(__ret.payload, {
      association: __ret.association, portalUser: __ret.portalUser,
    });
    loginToken = __ret.loginToken;
    let payload = __ret.payload;
    payload.activateAssociation = 'false';
    let response = await request(applicationContext.getHttpServer())
      .put('/associations/onboard')
      .set('Authorization', loginToken)
      .send(payload);

    expect(response.status).toEqual(201);
    expect(response.body.data.address).toBeDefined();
    expect(response.body.data.type).toBeDefined();
  });
  afterAll(async () => {
    await connection.close();
    await applicationContext.close();
  });
});
