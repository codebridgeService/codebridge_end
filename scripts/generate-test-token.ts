import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { getJwtSecret, getJwtRefreshSecret } from '../src/middleware/auth.middleware';

function generateTestTokens() {
  const role = process.argv[2] || 'admin';
  const email = process.argv[3] || (role === 'admin' ? 'admin@codebridge.com' : 'user@codebridge.com');
  const userId = process.argv[4] || (role === 'admin' ? '64b1f2e3d4c5b6a789012345' : '64b1f2e3d4c5b6a789012346');
  const name = role === 'admin' ? 'Super Admin (Test)' : 'Test User';
  const expiresIn = process.argv[5] || '7d';

  const jwtSecret = getJwtSecret();
  const jwtRefreshSecret = getJwtRefreshSecret();

  const tokenPayload = {
    userId,
    email,
    role,
  };

  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: expiresIn as any });
  const refreshToken = jwt.sign({ userId, email }, jwtRefreshSecret, { expiresIn: '30d' as any });

  const userObj = {
    id: userId,
    email,
    name,
    role,
  };

  console.log('\n======================================================');
  console.log(`🔑 GENERATED TEST ${role.toUpperCase()} TOKEN (Valid for ${expiresIn})`);
  console.log('======================================================\n');
  console.log('--- USER INFO ---');
  console.log(JSON.stringify(userObj, null, 2));

  console.log('\n--- ACCESS TOKEN ---');
  console.log(token);

  console.log('\n--- REFRESH TOKEN ---');
  console.log(refreshToken);

  console.log('\n--- BROWSER CONSOLE PASTE (Run in DevTools Console to instant login) ---');
  console.log(`localStorage.setItem('token', '${token}');`);
  console.log(`localStorage.setItem('refreshToken', '${refreshToken}');`);
  console.log(`localStorage.setItem('user', JSON.stringify(${JSON.stringify(userObj)}));`);
  console.log(`location.reload();`);

  console.log('\n--- CURL AUTHORIZATION HEADER ---');
  console.log(`Authorization: Bearer ${token}`);
  console.log('======================================================\n');
}

generateTestTokens();
