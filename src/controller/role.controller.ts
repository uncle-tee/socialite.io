import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { AssociationContext } from '../dlabs-nest-starter/security/annotations/association-context';
import { RoleRequest } from '../dto/role.request';
import { RequestPrincipalContext } from '../dlabs-nest-starter/security/decorators/request-principal.docorator';
import { RequestPrincipal } from '../dlabs-nest-starter/security/request-principal.service';
import { RoleService } from '../service-impl/role.service';
import { ApiResponseDto } from '../dto/api-response.dto';
import { RoleMembershipRequestDto } from '../dto/role-membership.request.dto';
import { Connection } from 'typeorm/connection/Connection';
import { MembershipRepository } from '../dao/membership.repository';
import { PortalAccountTypeConstant } from '../domain/enums/portal-account-type-constant';
import { RoleRepository } from '../dao/role.repository';
import { GenericStatusConstant } from '../domain/enums/generic-status-constant';
import { IllegalArgumentException } from '../exception/illegal-argument.exception';
import { RoleHandler } from './handlers/role.handler';

@AssociationContext()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService,
              private readonly roleTransformer: RoleHandler,
              private readonly connection: Connection) {
  }

  @Post()
  create(@Body()request: RoleRequest,
         @RequestPrincipalContext() requestPrincipal: RequestPrincipal) {
    return this.roleService.createRole(request, requestPrincipal.association)
      .then(role => {
        return new ApiResponseDto(role, 201);
      });
  }


  @Delete('/:code')
  delete(@Param('code')code: string, @RequestPrincipalContext() requestPrincipal: RequestPrincipal) {
    return this.connection.getCustomRepository(RoleRepository)
      .findOne({ code, status: GenericStatusConstant.ACTIVE, association: requestPrincipal.association })
      .then(role => {
        if (!role) {
          throw new NotFoundException('Role with code cannot be found');
        }
        return this.roleService.deleteRole(role).then(() => new ApiResponseDto({}, 204));
      });
  }

  @Get(':code')
  get(@Param('code') code: string, @RequestPrincipalContext() requestPrincipal: RequestPrincipal) {
    return this.connection.getCustomRepository(RoleRepository)
      .findOne({ code, status: GenericStatusConstant.ACTIVE, association: requestPrincipal.association })
      .then(role => {
        if (!role) {
          throw new NotFoundException('Role with code cannot be found');
        }
        return this.roleTransformer
          .transform(role).then(res => {
            return new ApiResponseDto(res);
          });

      });
  }


}