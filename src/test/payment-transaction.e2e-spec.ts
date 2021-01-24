import { INestApplication } from '@nestjs/common';
import { Connection } from 'typeorm/connection/Connection';
import { Association } from '../domain/entity/association.entity';
import { TestingModule } from '@nestjs/testing';
import { baseTestingModule, getAssociationUser, mockPaymentTransactions } from './test-utils';
import { ValidatorTransformPipe } from '../conf/validator-transform.pipe';
import { getConnection } from 'typeorm';
import { factory } from './factory';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import * as request from 'supertest';
import { PaymentTransaction } from '../domain/entity/payment-transaction.entity';
import { PaymentRequest } from '../domain/entity/payment-request.entity';

describe('Payment Transactions', () => {
  let applicationContext: INestApplication;
  let connection: Connection;
  let association: Association;
  let assoUser;

  beforeAll(async () => {
    const moduleRef: TestingModule = await baseTestingModule().compile();
    applicationContext = moduleRef.createNestApplication();
    applicationContext.useGlobalPipes(new ValidatorTransformPipe());
    await applicationContext.init();

    connection = getConnection();
    association = await factory().upset(Association).use(association => {
      association.status = GenericStatusConstant.ACTIVE;
      return association;
    }).create();

    assoUser = await getAssociationUser(GenericStatusConstant.ACTIVE, null, association);
  });

  it('Test that a payment transaction can be gotten by query', async () => {
    jest.setTimeout(12000)
    await mockPaymentTransactions(association);
    let response = await request(applicationContext.getHttpServer())
      .get(`/payment-transactions?limit=${5}`)
      .set('Authorization', assoUser.token)
      .set('X-ASSOCIATION-IDENTIFIER', assoUser.association.code);

    const data = response.body.items[0];
    expect(parseInt(response.body.itemsPerPage.toString())).toEqual(5);
    expect(parseInt(response.body.total.toString())).toEqual(10);
    expect(data.paidByFirstName).toBeDefined();
    expect(data.paidByLastLastName).toBeDefined();
    expect(data.amountInMinorUnit).toBeDefined();
    expect(data.membershipReference).toBeDefined();
    expect(data.transactionReference).toBeDefined();
    expect(data.paymentDate).toBeDefined();
  });

  afterAll(async () => {
    await connection.close();
    await applicationContext.close();
  });

});