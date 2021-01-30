import { DynamicModule, Global, Module } from '@nestjs/common';
import { PaymentConfig, PaymentConfigAsyncOption } from '@dlabs/payment/dto';
import {
  createPaymentConfigAsyncProviders,
  createPaymentProvider, FlutterwaveBankVerificationProvider,
  FlutterwaveTransactionProvider,
  HttpClientProvider,
} from './payment.provider';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class PaymentModule {

  static forRoot(config: PaymentConfig) {
    const providers = [
      ...createPaymentProvider(config),
      HttpClientProvider,
      FlutterwaveTransactionProvider,
      FlutterwaveBankVerificationProvider,
    ];
    return {
      module: PaymentModule,
      providers,
      exports: [
        FlutterwaveTransactionProvider,
        FlutterwaveBankVerificationProvider,
      ],
    };
  }


  static forRootAsync(asyncConfig: PaymentConfigAsyncOption): DynamicModule {
    const providers = [...createPaymentConfigAsyncProviders(asyncConfig),
      HttpClientProvider,
      FlutterwaveTransactionProvider,
      FlutterwaveBankVerificationProvider,
    ];

    return {
      module: PaymentModule,
      providers,
      imports: asyncConfig.imports,
      exports: [
        FlutterwaveTransactionProvider,
        FlutterwaveBankVerificationProvider,
      ],
    };
  }
}
