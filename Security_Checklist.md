# AI Coding Security Checklist

## Pre-Development Security Checklist

### Code Planning & Design
- [ ] Threat modeling completed for application
- [ ] Security requirements defined
- [ ] Data classification completed (public, internal, confidential, secret)
- [ ] Privacy impact assessment (PIA) done if handling personal data
- [ ] Security architecture review completed
- [ ] Compliance requirements identified (GDPR, HIPAA, PCI-DSS, etc.)

### Development Environment
- [ ] IDE security plugins installed (SonarLint, Checkmarx, etc.)
- [ ] Pre-commit hooks configured for security scanning
- [ ] Secrets detection tools configured (git-secrets, detect-secrets)
- [ ] VPN configured for remote development
- [ ] Code repository access controls configured
- [ ] Development database isolated from production

### Security Tools Setup
- [ ] SAST (Static Application Security Testing) tools configured
- [ ] DAST (Dynamic Application Security Testing) tools available
- [ ] Dependency vulnerability scanning configured
- [ ] Container scanning tools set up (if using containers)
- [ ] Infrastructure as Code (IaC) security tools configured

## During Development Security Checklist

### Code Quality & Security
- [ ] All inputs validated and sanitized
- [ ] SQL queries use parameterized statements
- [ ] No hardcoded credentials or API keys
- [ ] Cryptographic operations use approved libraries
- [ ] Secure random number generation used
- [ ] File uploads validated and sanitized
- [ ] Output encoding implemented
- [ ] Content Security Policy (CSP) headers configured

### Authentication & Authorization
- [ ] Multi-factor authentication implemented where appropriate
- [ ] Password complexity requirements enforced
- [ ] Session management follows security best practices
- [ ] Role-based access control (RBAC) implemented
- [ ] Principle of least privilege applied
- [ ] API authentication tokens properly secured
- [ ] OAuth 2.0/OpenID Connect implemented correctly

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Data encrypted in transit (TLS 1.2+)
- [ ] Personal data anonymized where possible
- [ ] Data retention policies implemented
- [ ] Data backup and recovery procedures tested
- [ ] Key management procedures in place
- [ ] Data masking implemented for non-production environments

### API Security
- [ ] API rate limiting implemented
- [ ] Input validation on all API endpoints
- [ ] API versioning strategy implemented
- [ ] OpenAPI/Swagger documentation secured
- [ ] API authentication and authorization verified
- [ ] CORS policies properly configured
- [ ] API response filtering implemented

### Error Handling & Logging
- [ ] Error messages don't reveal sensitive information
- [ ] Security events logged appropriately
- [ ] Log data sanitized to remove sensitive information
- [ ] Log integrity protection implemented
- [ ] Centralized logging system configured
- [ ] Log monitoring and alerting set up

## Testing Security Checklist

### Security Testing
- [ ] Penetration testing completed
- [ ] Vulnerability scanning completed
- [ ] Code review for security completed
- [ ] Dependency vulnerability scan completed
- [ ] Container security scanning completed
- [ ] Infrastructure security scanning completed
- [ ] Social engineering testing considered

### Functional Security Testing
- [ ] Authentication bypass attempts tested
- [ ] Authorization escalation tested
- [ ] Input validation tested with malicious payloads
- [ ] File upload security tested
- [ ] Session management tested
- [ ] Password reset functionality tested
- [ ] Multi-factor authentication tested

## Pre-Production Security Checklist

### Configuration Management
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)
- [ ] Unnecessary services and ports disabled
- [ ] Default passwords changed
- [ ] Unnecessary features and modules disabled
- [ ] Security configurations documented
- [ ] Environment-specific configurations reviewed

### Monitoring & Incident Response
- [ ] Security monitoring tools configured
- [ ] Incident response plan documented
- [ ] Security team contact information updated
- [ ] Automated security alerting configured
- [ ] Log aggregation and analysis tools configured
- [ ] Backup and disaster recovery procedures tested

### Compliance & Documentation
- [ ] Security documentation updated
- [ ] Compliance requirements verified
- [ ] Security training completed for all team members
- [ ] Security policies and procedures reviewed
- [ ] Code of conduct reviewed

## Post-Production Security Checklist

### Continuous Security
- [ ] Regular security updates applied
- [ ] Vulnerability monitoring active
- [ ] Security metrics tracked and reviewed
- [ ] Regular security assessments scheduled
- [ ] Incident response procedures tested
- [ ] Security awareness training ongoing

### Monitoring & Maintenance
- [ ] Security monitoring alerts reviewed daily
- [ ] Vulnerability assessments conducted regularly
- [ ] Security patches applied promptly
- [ ] Access reviews conducted periodically
- [ ] Security documentation kept current
- [ ] Third-party security assessments conducted

## AI-Specific Security Considerations

### Data Privacy
- [ ] Training data anonymized
- [ ] Model outputs don't contain sensitive information
- [ ] Data retention policies for AI systems defined
- [ ] Privacy-preserving techniques implemented (federated learning, differential privacy)

### Model Security
- [ ] Model versioning and integrity checking implemented
- [ ] Adversarial robustness testing completed
- [ ] Model explainability implemented for critical decisions
- [ ] Model bias testing completed
- [ ] Input validation for AI model inputs

### AI Pipeline Security
- [ ] Model training environment secured
- [ ] Model deployment pipeline secured
- [ ] Model serving infrastructure protected
- [ ] Model monitoring and drift detection implemented
- [ ] Model rollback procedures defined

## Quick Security Commands

### Check for secrets in code
```bash
# Using git-secrets
git secrets --scan

# Using detect-secrets
detect-secrets scan --baseline .secrets.baseline

# Using grep patterns
grep -r -E "(password|secret|api_key|token)" --exclude-dir=node_modules .
```

### Dependency vulnerability scanning
```bash
# Node.js
npm audit
npm audit fix

# Python
pip install safety
safety check

# Ruby
bundle audit
```

### Security headers check
```bash
curl -I https://your-app.com | grep -E "(X-|Content-Security|Strict-Transport)"
```

### SSL/TLS configuration check
```bash
nmap --script ssl-enum-ciphers -p 443 your-app.com
sslyze your-app.com
```

## Emergency Contacts

### Internal Contacts
- Security Team: [security@company.com]
- DevOps Team: [devops@company.com]
- Legal/Compliance: [legal@company.com]

### External Contacts
- Security Incident Response: [contact external IR team]
- Cloud Provider Security: [cloud security contact]
- Regulatory Bodies: [if applicable]

---

**Remember**: Security is not a one-time activity but an ongoing process. Regular reviews and updates of this checklist are essential to maintain security posture.