import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const issuer = process.env.OIDC_ISSUER;
    const audience = process.env.OIDC_AUDIENCE;
    let opts: StrategyOptions;
    if (issuer && audience) {
      opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        issuer,
        audience,
        algorithms: ['RS256'],
        secretOrKeyProvider: jwksRsa.passportJwtSecret({
          cache: true, rateLimit: true, jwksUri: `${issuer}/discovery/v2.0/keys`,
        }) as any,
      };
    } else {
      opts = { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: true, secretOrKey: 'dev-secret' } as any;
    }
    super(opts);
  }
  async validate(payload: any) {
    if (!payload) throw new UnauthorizedException();
    const tenantId = payload[process.env.TENANT_CLAIM || 'tid'] || payload['tenantId'];
    const roles = payload[process.env.ROLE_CLAIM || 'roles'] || [];
    return { sub: payload.sub || 'dev-user', tenantId, roles, email: payload.preferred_username || payload.upn || payload.email };
  }
}
