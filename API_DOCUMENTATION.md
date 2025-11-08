# API Documentation - User Management and CRUD Endpoints

## Overview
This document describes the new CRUD endpoints added for user management, issue types, field definitions, comments, and attachments.

## Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <jwt-token>
```

## User Management Endpoints

### Update User (Admin Only)
Updates user information. Admins can update any user in their tenant.

**Endpoint**: `PATCH /users/:id`

**Authorization**: ADMIN

**Request Body**:
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "USER | ADMIN (optional)"
}
```

**Response**: `200 OK`
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "USER | ADMIN",
  "tenantId": "string"
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User belongs to different tenant
- `404 Not Found` - User not found
- `400 Bad Request` - Email already in use

---

### Delete User (Admin Only)
Permanently deletes a user from the system.

**Endpoint**: `DELETE /users/:id`

**Authorization**: ADMIN

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User belongs to different tenant
- `404 Not Found` - User not found

---

### Reset User Password (Admin Only)
Resets a user's password. Used for admin-initiated password resets.

**Endpoint**: `POST /users/:id/reset-password`

**Authorization**: ADMIN

**Request Body**:
```json
{
  "password": "string"
}
```

**Response**: `201 Created`
```json
{
  "success": true
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User belongs to different tenant
- `404 Not Found` - User not found

---

### Update Own Profile
Allows users to update their own profile information. Cannot change role.

**Endpoint**: `PATCH /users/me`

**Authorization**: ADMIN, USER

**Request Body**:
```json
{
  "name": "string (optional)",
  "email": "string (optional)"
}
```

**Response**: `200 OK`
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "USER | ADMIN",
  "tenantId": "string"
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid token
- `400 Bad Request` - Email already in use

---

### Change Own Password
Allows users to change their own password.

**Endpoint**: `POST /users/me/change-password`

**Authorization**: ADMIN, USER

**Request Body**:
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Response**: `201 Created`
```json
{
  "success": true
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid old password or missing token

---

## Issue Type Management

### Create Issue Type
Creates a new issue type for the tenant.

**Endpoint**: `POST /directory/issue-types`

**Authorization**: ADMIN

**Request Body**:
```json
{
  "key": "string (e.g., 'MAINTENANCE')",
  "label": "string (e.g., 'Maintenance Request')"
}
```

**Response**: `201 Created`
```json
{
  "id": "string",
  "tenantId": "string",
  "key": "string",
  "label": "string",
  "active": true
}
```

---

### Update Issue Type
Updates an existing issue type.

**Endpoint**: `PATCH /directory/issue-types/:id`

**Authorization**: ADMIN

**Request Body**:
```json
{
  "key": "string (optional)",
  "label": "string (optional)",
  "active": "boolean (optional)"
}
```

**Response**: `200 OK`
```json
{
  "id": "string",
  "tenantId": "string",
  "key": "string",
  "label": "string",
  "active": "boolean"
}
```

---

### Delete Issue Type (Soft Delete)
Deactivates an issue type (soft delete).

**Endpoint**: `DELETE /directory/issue-types/:id`

**Authorization**: ADMIN

**Response**: `200 OK`
```json
{
  "id": "string",
  "tenantId": "string",
  "key": "string",
  "label": "string",
  "active": false
}
```

---

## Field Definition Management

### Create Field Definition
Creates a new custom field definition.

**Endpoint**: `POST /directory/field-definitions`

**Authorization**: ADMIN

**Request Body**:
```json
{
  "key": "string (e.g., 'priority_level')",
  "label": "string (e.g., 'Priority Level')",
  "datatype": "string | number | boolean | date | email | url | phone | text",
  "required": "boolean (optional, default: false)",
  "enumOptions": ["string"] (optional),
  "validation": "object (optional)",
  "uiHints": "object (optional)",
  "isIndexed": "boolean (optional, default: false)"
}
```

**Response**: `201 Created`
```json
{
  "id": "string",
  "tenantId": "string",
  "key": "string",
  "label": "string",
  "datatype": "string",
  "required": "boolean",
  "enumOptions": ["string"],
  "validation": "object | null",
  "uiHints": "object | null",
  "isIndexed": "boolean"
}
```

---

### Update Field Definition
Updates an existing field definition.

**Endpoint**: `PATCH /directory/field-definitions/:id`

**Authorization**: ADMIN

**Request Body**:
```json
{
  "label": "string (optional)",
  "required": "boolean (optional)",
  "enumOptions": ["string"] (optional),
  "validation": "object (optional)",
  "uiHints": "object (optional)",
  "isIndexed": "boolean (optional)"
}
```

**Response**: `200 OK`
```json
{
  "id": "string",
  "tenantId": "string",
  "key": "string",
  "label": "string",
  "datatype": "string",
  "required": "boolean",
  "enumOptions": ["string"],
  "validation": "object | null",
  "uiHints": "object | null",
  "isIndexed": "boolean"
}
```

---

### Delete Field Definition
Permanently deletes a field definition.

**Endpoint**: `DELETE /directory/field-definitions/:id`

**Authorization**: ADMIN

**Response**: `200 OK`

---

## Comment Management

### Update Comment
Updates a comment. Users can only edit their own comments. Admins can edit any comment.

**Endpoint**: `PATCH /tickets/:ticketId/comments/:id`

**Authorization**: ADMIN, USER

**Request Body**:
```json
{
  "body": "string"
}
```

**Response**: `200 OK`
```json
{
  "id": "string",
  "tenantId": "string",
  "ticketId": "string",
  "authorUserId": "string | null",
  "body": "string",
  "visibility": "INTERNAL | PUBLIC",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

**Error Responses**:
- `403 Forbidden` - User is not the author
- `404 Not Found` - Comment not found

---

### Delete Comment
Deletes a comment. Users can only delete their own comments. Admins can delete any comment.

**Endpoint**: `DELETE /tickets/:ticketId/comments/:id`

**Authorization**: ADMIN, USER

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Error Responses**:
- `403 Forbidden` - User is not the author and not an admin
- `404 Not Found` - Comment not found

---

## Attachment Management

### List Attachments
Lists all attachments for a ticket with presigned download URLs.

**Endpoint**: `GET /tickets/:ticketId/attachments`

**Authorization**: ADMIN, USER

**Response**: `200 OK`
```json
[
  {
    "id": "string",
    "ticketId": "string",
    "filename": "string",
    "mimeType": "string",
    "sizeBytes": "number",
    "createdAt": "datetime",
    "downloadUrl": "string (presigned S3 URL, valid for 5 minutes)"
  }
]
```

---

### Delete Attachment
Deletes an attachment from both S3 and the database.

**Endpoint**: `DELETE /tickets/:ticketId/attachments/:id`

**Authorization**: ADMIN, USER

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Error Responses**:
- `404 Not Found` - Attachment not found

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Bad Request"
}
```

## Multi-Tenancy
All endpoints enforce tenant isolation. Users can only access resources within their own tenant. Cross-tenant access attempts will result in 403 Forbidden or 404 Not Found responses.

## Rate Limiting
Standard rate limiting applies to all endpoints. Excessive requests may be throttled.

## Security Notes
1. All endpoints require authentication
2. Role-based access control is enforced (ADMIN vs USER)
3. Tenant isolation prevents cross-tenant data access
4. Users can only modify their own resources unless they are admins
5. Presigned URLs for attachments expire after 5 minutes
