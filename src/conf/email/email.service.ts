import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { MailerOptions, MailerOptionsFactory } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';


@Injectable()
export class EmailService {


  constructor(private readonly configService: ConfigService) {
  }


  public getEmailConfig(): MailerOptions {

    return {
      transport: {
        host: this.configService.get<string>('MAILER_HOST', 'smtp.example.com'),
        port: this.configService.get<number>('EMAIL_PORT', 587),
        secure: false,
        auth: {
          user: this.configService.get<string>('EMAIL_USER', 'dlabs_mailer'),
          pass: this.configService.get<string>('EMAIL_PASS', 'dlabs_password'),
        },
      },
      defaults: {
        from: this.configService.get<string>('EMAIL_SENDER', '"Socialite.io" <no-reply@socialite.io>'),
      },
      template: {
        dir: process.cwd() + '/view/email/',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    };
  }
}