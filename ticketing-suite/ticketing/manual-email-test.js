#!/usr/bin/env node

/**
 * Manual Test Script for Email Notification Feature
 * 
 * This script demonstrates how the email notification feature works when creating a new user.
 * 
 * Prerequisites:
 * 1. Backend server must be running
 * 2. SMTP environment variables must be configured (optional - graceful degradation if not set)
 * 3. You need an admin token to create users
 * 
 * Environment Variables (optional for email):
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 * - SMTP_FROM: Email from address
 * 
 * Usage:
 *   node manual-email-test.js <admin-token> <new-user-email> <tenant-id>
 * 
 * Example:
 *   node manual-email-test.js eyJhbGc... newuser@example.com test-tenant-123
 */

const API = process.env.API_URL || 'http://localhost:3000';

async function createUserWithEmail(adminToken, email, tenantId) {
  const timestamp = Date.now();
  const userData = {
    email: email || `testuser-${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: `Test User ${timestamp}`,
    role: 'USER',
    tenantId: tenantId || 'test-tenant',
  };

  console.log('Creating user with data:', { ...userData, password: '***' });
  console.log('');

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create user: ${res.status} - ${error}`);
  }

  const user = await res.json();
  console.log('✓ User created successfully:', user);
  console.log('');
  console.log('Email notification behavior:');
  console.log('- If SMTP is configured: Email sent to', userData.email);
  console.log('- If SMTP not configured: User creation succeeds, but no email sent (check server logs)');
  console.log('');
  console.log('Email would contain:');
  console.log('  Subject: Welcome to Ticketing System - Your Login Details');
  console.log('  To:', userData.email);
  console.log('  Body: HTML email with login credentials');
  console.log('  - Email:', userData.email);
  console.log('  - Password:', userData.password);
  console.log('  - Security notice to change password after first login');
  
  return user;
}

async function run() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node manual-email-test.js <admin-token> [email] [tenant-id]');
    console.error('');
    console.error('Example:');
    console.error('  node manual-email-test.js eyJhbGc... newuser@example.com test-tenant-123');
    process.exit(1);
  }

  const [adminToken, email, tenantId] = args;

  try {
    await createUserWithEmail(adminToken, email, tenantId);
    console.log('');
    console.log('✓ Test completed successfully!');
  } catch (err) {
    console.error('✗ Test failed:', err.message);
    process.exitCode = 1;
  }
}

run();
