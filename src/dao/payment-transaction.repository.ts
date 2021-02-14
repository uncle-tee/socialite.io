import { BaseRepository } from '../common/BaseRepository';
import { PaymentTransaction } from '../domain/entity/payment-transaction.entity';
import { EntityRepository, In } from 'typeorm';
import { PaymentRequest } from '../domain/entity/payment-request.entity';
import { Association } from '../domain/entity/association.entity';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import { PaymentTransactionSearchQueryDto } from '../dto/payment-transaction-search.query.dto';
import * as moment from 'moment';
import { Bill } from '../domain/entity/bill.entity';
import { Invoice } from '../domain/entity/invoice.entity';
import { BillInvoice } from '../domain/entity/bill-invoice.entity';

@EntityRepository(PaymentTransaction)
export class PaymentTransactionRepository extends BaseRepository<PaymentTransaction> {

  findByBills(bills: Bill[], status = GenericStatusConstant.ACTIVE) {
    if (!bills || !bills.length) {
      return Promise.resolve(undefined);
    }
    const billIds = bills.map(bill => bill.id);
    this.createQueryBuilder('paymentTransaction')
      .innerJoin(PaymentRequest, 'paymentRequest', 'paymentTransaction.paymentRequest = paymentRequest.id')
      .innerJoin(Invoice, 'invoice', 'invoice.id = paymentRequest.invoice')
      .innerJoin(BillInvoice, 'billInvoice', 'billInvoice.invoice = invoice.id')
      .where('billInvoice.bill IN (:...billIds)', billIds)
      .andWhere('bill.status = :status', { status })
      .getMany();
  }

  findByPaymentRequest(paymentRequest: PaymentRequest) {
    return this.findOne({
      paymentRequest: paymentRequest,
    });
  }

  findByPaymentRequests(paymentRequests: PaymentRequest[]) {
    return this.find({
      where: {
        paymentRequest: In(paymentRequests),
      },
    });
  }


  findByAssociationAndQuery(association: Association, query: PaymentTransactionSearchQueryDto, status = GenericStatusConstant.ACTIVE) {
    const builder = this.createQueryBuilder('paymentTransaction')
      .innerJoin(PaymentRequest, 'paymentRequest', 'paymentTransaction.paymentRequest = paymentRequest.id')
      .innerJoin(Association, 'association', 'paymentRequest.association = association.id')
      .where('association.id = :associationId')
      .andWhere('paymentTransaction.status = :status')
      .setParameter('associationId', association.id)
      .setParameter('status', status)
      .orderBy('paymentTransaction.id', 'DESC')
      .offset(query.offset)
      .limit(query.limit);

    if (query.minAmountInMinorUnit) {
      builder.andWhere('paymentTransaction.amountInMinorUnit >= :minAmount', { minAmount: query.minAmountInMinorUnit });
    }
    if (query.maxAmountInMinorUnit) {
      builder.andWhere('paymentTransaction.amountInMinorUnit <= :maxAmount', { maxAmount: query.maxAmountInMinorUnit });
    }
    if (query.dateCreatedAfter) {
      const date = moment(query.dateCreatedAfter, 'DD/MM/YYYY').startOf('day').toDate();
      builder.andWhere('paymentTransaction.confirmedPaymentDate >= :afterDate', { afterDate: date });
    }

    if (query.dateCreatedBefore) {
      const date = moment(query.dateCreatedBefore, 'DD/MM/YYYY').endOf('day').toDate();
      builder.andWhere('paymentTransaction.confirmedPaymentDate <= :beforeDate', { beforeDate: date });
    }
    return builder.getManyAndCount();
  }

}