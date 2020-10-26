import {ArgumentsHost, Catch, ExceptionFilter} from '@nestjs/common';
import {Response} from 'express';
import {UnAuthorizedException} from '../../exception/unAuthorized.exception';
import {NotActiveException} from "../../exception/notActive.exception";

@Catch(NotActiveException)
export class NotActiveExceptionFilter implements ExceptionFilter<UnAuthorizedException> {

    catch(exception: NotActiveException, host: ArgumentsHost): any {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        response
            .status(429)
            .json({
                code: 429,
                message: exception.message,
            });
    }
}