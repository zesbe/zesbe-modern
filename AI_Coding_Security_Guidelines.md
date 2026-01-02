# AI Coding Security Guidelines
## Panduan Keamanan untuk AI Coding Assistant

### 🔐 Prinsip Utama Keamanan

#### 1. **Always Validate and Sanitize Inputs**
```javascript
// ❌ Jangan pernah langsung menggunakan input user
function processUserInput(userInput) {
    return eval(userInput); // DANGEROUS!
}

// ✅ Selalu validasi dan sanitize input
function processUserInput(userInput) {
    // Validasi input
    if (!userInput || typeof userInput !== 'string') {
        throw new Error('Invalid input');
    }
    
    // Whitelist allowed operations
    const allowedPatterns = /^[a-zA-Z0-9\s\-_]+$/;
    if (!allowedPatterns.test(userInput)) {
        throw new Error('Input contains forbidden characters');
    }
    
    // Process safely
    return sanitizeString(userInput);
}
```

#### 2. **Implement Proper Authentication & Authorization**
```javascript
// ✅ Implement proper auth middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// ✅ Role-based access control
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
```

#### 3. **Secure Data Handling**
```javascript
// ✅ Encrypt sensitive data
const crypto = require('crypto');

function encryptSensitiveData(data) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex')
    };
}

// ✅ Hash passwords with salt
const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}
```

#### 4. **Input Validation & Sanitization**
```javascript
// ✅ Comprehensive input validation
const Joi = require('joi');

const userSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    age: Joi.number().integer().min(18).max(120),
    phone: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/)
});

function validateUserInput(input) {
    const { error, value } = userSchema.validate(input);
    if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
}

// ✅ SQL Injection prevention
const mysql = require('mysql2/promise');

async function getUserById(userId) {
    // ✅ Use parameterized queries
    const [rows] = await db.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
    );
    return rows;
    
    // ❌ Never do this:
    // const query = `SELECT * FROM users WHERE id = ${userId}`;
}
```

#### 5. **Error Handling & Information Disclosure**
```javascript
// ✅ Secure error handling
function handleError(error, req, res) {
    // Log full error server-side
    console.error('Server error:', error);
    
    // Return generic error to client
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        error: isDevelopment ? error.message : 'Internal server error',
        requestId: req.id // For debugging without exposing details
    });
}

// ✅ Proper logging
function logSecurityEvent(event, details) {
    logger.info('Security event', {
        event,
        details,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent
    });
}
```

#### 6. **API Security Best Practices**
```javascript
// ✅ Rate limiting
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
});

// ✅ CORS configuration
const cors = require('cors');

const corsOptions = {
    origin: ['https://yourdomain.com'],
    credentials: true,
    optionsSuccessStatus: 200
};

// ✅ Input size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

#### 7. **Content Security Policy (CSP)**
```javascript
// ✅ Implement CSP headers
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self'");
    
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    next();
});
```

#### 8. **Dependency Security**
```javascript
// ✅ Regular security audits
// Run these commands regularly:
// npm audit
// npm audit fix
// npm update

// ✅ Use secure packages
{
  "scripts": {
    "security-audit": "npm audit && npm run test",
    "dependency-check": "npx audit-ci --moderate"
  }
}

// ✅ Pin dependency versions in package.json
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "4.17.21" // Pin exact version
  }
}
```

### 🛡️ Security Testing Guidelines

#### 1. **Unit Tests for Security**
```javascript
// ✅ Security-focused unit tests
describe('Security Tests', () => {
    test('should prevent SQL injection', async () => {
        const maliciousInput = "'; DROP TABLE users; --";
        expect(() => validateUserInput({ 
            username: maliciousInput 
        })).toThrow();
    });
    
    test('should validate input length', () => {
        const longInput = 'a'.repeat(1000);
        expect(() => validateUserInput({ 
            username: longInput 
        })).toThrow();
    });
});
```

#### 2. **Integration Tests**
```javascript
// ✅ Test authentication flows
describe('Authentication Security', () => {
    test('should reject requests without token', async () => {
        const response = await request(app)
            .get('/protected-route')
            .expect(401);
        
        expect(response.body.error).toBe('Authentication required');
    });
});
```

### 📋 Security Checklist

#### Before Deployment:
- [ ] All inputs validated and sanitized
- [ ] Authentication and authorization implemented
- [ ] Sensitive data encrypted
- [ ] Error messages don't expose system details
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Dependencies audited for vulnerabilities
- [ ] Logging and monitoring in place
- [ ] Backup and recovery procedures tested

#### Code Review Security Focus:
- [ ] No hardcoded credentials or API keys
- [ ] No eval() or similar dynamic code execution
- [ ] SQL queries use parameterized statements
- [ ] File uploads properly validated
- [ ] Session management secure
- [ ] Password policies enforced
- [ ] API endpoints protected
- [ ] No information leakage in error messages

### 🚨 Common Vulnerabilities to Avoid

1. **Injection Attacks** (SQL, NoSQL, OS Command)
2. **Broken Authentication**
3. **Sensitive Data Exposure**
4. **XML External Entities (XXE)**
5. **Broken Access Control**
6. **Security Misconfiguration**
7. **Cross-Site Scripting (XSS)**
8. **Insecure Deserialization**
9. **Using Components with Known Vulnerabilities**
10. **Insufficient Logging & Monitoring**

### 🔧 Security Tools Integration

```json
{
  "devDependencies": {
    "eslint-plugin-security": "^1.5.0",
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0"
  },
  "lint-staged": {
    "*.js": [
      "eslint --ext .js --fix",
      "npm run test:security"
    ]
  }
}
```

### 📚 Resources

1. **OWASP Top 10** - https://owasp.org/www-project-top-ten/
2. **Node.js Security Checklist** - https://nodejs.org/en/docs/guides/security/
3. **Express.js Security Best Practices** - https://expressjs.com/en/advanced/best-practice-security.html
4. **Snyk Security Database** - https://snyk.io/vuln/

---

**Remember: Security is not a one-time task, it's an ongoing process that requires constant vigilance and improvement.**