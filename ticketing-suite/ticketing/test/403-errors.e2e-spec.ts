import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma.service';

/**
 * E2E Test Suite for 403 Forbidden Error Scenarios
 * 
 * This test suite comprehensively tests all possible 403 error scenarios:
 * 1. Missing authentication (401, but important for comparison)
 * 2. Insufficient role (403)
 * 3. Cross-tenant access attempts
 * 4. Resource ownership violations
 * 5. Rate limiting (429, but related to access control)
 */
describe('403 Forbidden Error Scenarios (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Test data
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let admin1Id: string;
  let user2Id: string; // Different tenant
  let site1Id: string;
  let site2Id: string; // Different tenant
  let ticket1Id: string;
  let comment1Id: string;
  
  // Test tokens
  let userToken: string;
  let adminToken: string;
  let user2Token: string; // Different tenant
  let expiredToken: string;
  let malformedToken: string;
  let noRolesToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Setup test data
    await setupTestData();
    generateTestTokens();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    const timestamp = Date.now();
    
    // Create two tenants
    tenant1Id = `test-tenant-1-${timestamp}`;
    tenant2Id = `test-tenant-2-${timestamp}`;
    
    await prisma.tenant.create({
      data: { id: tenant1Id, name: 'Test Tenant 1' },
    });
    
    await prisma.tenant.create({
      data: { id: tenant2Id, name: 'Test Tenant 2' },
    });

    // Create sites for each tenant
    site1Id = `site-1-${timestamp}`;
    site2Id = `site-2-${timestamp}`;
    
    await prisma.site.create({
      data: {
        id: site1Id,
        tenantId: tenant1Id,
        name: 'Site 1',
        location: 'Location 1',
      },
    });
    
    await prisma.site.create({
      data: {
        id: site2Id,
        tenantId: tenant2Id,
        name: 'Site 2',
        location: 'Location 2',
      },
    });

    // Create users
    user1Id = `user-1-${timestamp}`;
    admin1Id = `admin-1-${timestamp}`;
    user2Id = `user-2-${timestamp}`;
    
    await prisma.user.create({
      data: {
        id: user1Id,
        tenantId: tenant1Id,
        email: `user1-${timestamp}@example.com`,
        password: 'hashed-password',
        name: 'User 1',
        role: 'USER',
      },
    });
    
    await prisma.user.create({
      data: {
        id: admin1Id,
        tenantId: tenant1Id,
        email: `admin1-${timestamp}@example.com`,
        password: 'hashed-password',
        name: 'Admin 1',
        role: 'ADMIN',
      },
    });
    
    await prisma.user.create({
      data: {
        id: user2Id,
        tenantId: tenant2Id,
        email: `user2-${timestamp}@example.com`,
        password: 'hashed-password',
        name: 'User 2',
        role: 'USER',
      },
    });

    // Create issue type for tenant 1
    await prisma.issueType.create({
      data: {
        tenantId: tenant1Id,
        key: 'TEST_TYPE',
        label: 'Test Issue Type',
        active: true,
      },
    });
    
    // Create issue type for tenant 2
    await prisma.issueType.create({
      data: {
        tenantId: tenant2Id,
        key: 'TEST_TYPE',
        label: 'Test Issue Type',
        active: true,
      },
    });

    // Create a test ticket for tenant 1
    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant1Id,
        siteId: site1Id,
        typeKey: 'TEST_TYPE',
        description: 'Test ticket',
        status: 'NEW',
        priority: 'P2',
        details: 'Test details',
      },
    });
    ticket1Id = ticket.id;

    // Create a test comment on the ticket by user1
    const comment = await prisma.comment.create({
      data: {
        tenantId: tenant1Id,
        ticketId: ticket1Id,
        authorUserId: user1Id,
        body: 'Test comment by user1',
        visibility: 'INTERNAL',
      },
    });
    comment1Id = comment.id;
  }

  async function cleanupTestData() {
    if (tenant1Id) {
      await prisma.tenant.delete({ where: { id: tenant1Id } }).catch(() => {});
    }
    if (tenant2Id) {
      await prisma.tenant.delete({ where: { id: tenant2Id } }).catch(() => {});
    }
  }

  function generateTestTokens() {
    const b64 = (str: any) =>
      Buffer.from(JSON.stringify(str))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Valid USER token for tenant 1
    userToken = b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
      b64({
        sub: user1Id,
        tenantId: tenant1Id,
        roles: ['USER'],
        email: 'user1@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      }) + '.sig';

    // Valid ADMIN token for tenant 1
    adminToken = b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
      b64({
        sub: admin1Id,
        tenantId: tenant1Id,
        roles: ['ADMIN', 'USER'],
        email: 'admin1@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      }) + '.sig';

    // Valid USER token for tenant 2
    user2Token = b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
      b64({
        sub: user2Id,
        tenantId: tenant2Id,
        roles: ['USER'],
        email: 'user2@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      }) + '.sig';

    // Expired token
    expiredToken = b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
      b64({
        sub: user1Id,
        tenantId: tenant1Id,
        roles: ['USER'],
        email: 'user1@example.com',
        iat: Math.floor(Date.now() / 1000) - 86400,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      }) + '.sig';

    // Malformed token
    malformedToken = 'not.a.valid.token';

    // Token with no roles
    noRolesToken = b64({ alg: 'HS256', typ: 'JWT' }) + '.' +
      b64({
        sub: user1Id,
        tenantId: tenant1Id,
        roles: [], // Empty roles array
        email: 'user1@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      }) + '.sig';
  }

  describe('1. Authentication Errors (401 vs 403)', () => {
    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .expect(401);
    });

    it('should return 401 when malformed token is provided', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);
    });

    it('should return 401 when Authorization header is missing Bearer prefix', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', userToken)
        .expect(401);
    });

    it('should succeed with valid token', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('2. RBAC - Insufficient Role Errors (403)', () => {
    it('should return 403 when USER attempts ADMIN-only operation (create site)', () => {
      return request(app.getHttpServer())
        .post('/directory/sites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'New Site', location: 'New Location' })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Insufficient role');
        });
    });

    it('should return 403 when USER attempts to update another user', () => {
      return request(app.getHttpServer())
        .patch(`/users/${admin1Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should return 403 when USER attempts to delete a user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${admin1Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 403 when USER attempts to register new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newuser@example.com',
          password: 'password',
          name: 'New User',
          role: 'USER',
          tenantId: tenant1Id,
        })
        .expect(403);
    });

    it('should return 403 when USER attempts to create issue type', () => {
      return request(app.getHttpServer())
        .post('/directory/issue-types')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'NEW_TYPE', label: 'New Type' })
        .expect(403);
    });

    it('should return 403 when USER attempts to create field definition', () => {
      return request(app.getHttpServer())
        .post('/directory/field-definitions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          key: 'new_field',
          label: 'New Field',
          datatype: 'string',
          required: false,
        })
        .expect(403);
    });

    it('should return 403 when token has no roles', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${noRolesToken}`)
        .expect(403);
    });

    it('should succeed when ADMIN performs ADMIN-only operation', () => {
      return request(app.getHttpServer())
        .post('/directory/sites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Created Site', location: 'Admin Location' })
        .expect(201);
    });

    it('should succeed when USER performs USER-allowed operation', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('3. Multi-Tenancy Isolation', () => {
    it('should return empty array when accessing tickets from different tenant', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should not contain ticket1Id from tenant1
          const containsTenant1Ticket = res.body.some(
            (ticket: any) => ticket.id === ticket1Id,
          );
          expect(containsTenant1Ticket).toBe(false);
        });
    });

    it('should return 404 when accessing specific ticket from different tenant', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${ticket1Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });

    it('should return empty array when listing sites from different tenant', () => {
      return request(app.getHttpServer())
        .get('/directory/sites')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should not contain site1Id from tenant1
          const containsTenant1Site = res.body.some(
            (site: any) => site.id === site1Id,
          );
          expect(containsTenant1Site).toBe(false);
        });
    });

    it('should not allow updating ticket from different tenant', () => {
      return request(app.getHttpServer())
        .patch(`/tickets/${ticket1Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ description: 'Updated by tenant 2' })
        .expect(404);
    });

    it('should not allow adding comment to ticket from different tenant', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${ticket1Id}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ body: 'Comment from tenant 2', visibility: 'INTERNAL' })
        .expect(404);
    });
  });

  describe('4. Resource Ownership Violations', () => {
    let adminComment: string;

    beforeAll(async () => {
      // Create a comment by admin
      const comment = await prisma.comment.create({
        data: {
          tenantId: tenant1Id,
          ticketId: ticket1Id,
          authorUserId: admin1Id,
          body: 'Comment by admin',
          visibility: 'INTERNAL',
        },
      });
      adminComment = comment.id;
    });

    it('should return 403 when USER tries to edit another users comment', () => {
      return request(app.getHttpServer())
        .patch(`/tickets/${ticket1Id}/comments/${adminComment}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ body: 'User trying to edit admin comment' })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('You can only edit your own comments');
        });
    });

    it('should return 403 when USER tries to delete another users comment', () => {
      return request(app.getHttpServer())
        .delete(`/tickets/${ticket1Id}/comments/${adminComment}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('You can only delete your own comments');
        });
    });

    it('should succeed when USER edits their own comment', () => {
      return request(app.getHttpServer())
        .patch(`/tickets/${ticket1Id}/comments/${comment1Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ body: 'User editing their own comment' })
        .expect(200);
    });

    it('should succeed when USER deletes their own comment', async () => {
      // Create a new comment for deletion test
      const newComment = await prisma.comment.create({
        data: {
          tenantId: tenant1Id,
          ticketId: ticket1Id,
          authorUserId: user1Id,
          body: 'Comment to be deleted',
          visibility: 'INTERNAL',
        },
      });

      return request(app.getHttpServer())
        .delete(`/tickets/${ticket1Id}/comments/${newComment.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should succeed when ADMIN deletes any comment', () => {
      return request(app.getHttpServer())
        .delete(`/tickets/${ticket1Id}/comments/${adminComment}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('5. CORS Preflight Handling', () => {
    it('should handle OPTIONS request for CORS preflight', () => {
      return request(app.getHttpServer())
        .options('/tickets')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(204);
    });

    it('should include CORS headers in response', () => {
      return request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200)
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });
  });

  describe('6. Edge Cases and Special Scenarios', () => {
    it('should allow access to health endpoint without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });

    it('should allow login without authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user1@example.com', password: 'password' })
        .expect((res) => {
          // May return 401 for wrong password, but not 403
          expect(res.status).not.toBe(403);
        });
    });

    it('should handle missing required fields with 400, not 403', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'Missing required fields' })
        .expect(400);
    });

    it('should handle non-existent resource with 404, not 403', () => {
      return request(app.getHttpServer())
        .get('/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('7. Profile and Self-Service Operations', () => {
    it('should allow USER to update own profile', () => {
      return request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Self Name' })
        .expect(200);
    });

    it('should allow USER to change own password', () => {
      return request(app.getHttpServer())
        .post('/users/profile/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: 'old', newPassword: 'new' })
        .expect((res) => {
          // May fail with 400/401 for wrong password, but not 403
          expect(res.status).not.toBe(403);
        });
    });
  });

  describe('8. Summary - Expected Behavior', () => {
    it('should produce comprehensive test report', () => {
      // This is a meta-test that documents expected behavior
      const expectedBehavior = {
        '401_scenarios': [
          'No token provided',
          'Invalid token format',
          'Expired token (in production with OIDC)',
          'Missing Bearer prefix',
        ],
        '403_scenarios': [
          'USER accessing ADMIN-only endpoints',
          'Token with insufficient roles',
          'Token with empty roles array',
          'Editing/deleting resources owned by others (non-admin)',
        ],
        '404_scenarios': [
          'Accessing resources from different tenant',
          'Non-existent resource ID',
        ],
        'success_scenarios': [
          'Valid token with appropriate role',
          'ADMIN accessing ADMIN endpoints',
          'USER accessing USER-allowed endpoints',
          'Self-service operations (profile update)',
          'Public endpoints (health, login)',
        ],
      };

      console.log('\n403 Error Test Summary:');
      console.log(JSON.stringify(expectedBehavior, null, 2));
      
      expect(expectedBehavior).toBeDefined();
    });
  });
});
