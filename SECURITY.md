# Security Guide

## 🚨 CRITICAL: API Key Security

Your API keys have been **reset to placeholder values** for security. You must:

1. **Immediately revoke the exposed keys:**

   - ElevenLabs: Go to https://elevenlabs.io/app/speech-synthesis and revoke the old key
   - Google Gemini: Go to https://aistudio.google.com/app/apikey and revoke the old key

2. **Generate new API keys:**

   - Get a new ElevenLabs API key from https://elevenlabs.io
   - Get a new Gemini API key from https://aistudio.google.com

3. **Update your environment file:**
   ```bash
   # Edit server/.env with your new keys
   ELEVENLABS_API_KEY=sk_your_new_key_here
   GEMINI_API_KEY=AIza_your_new_key_here
   ```

## 🔒 Security Features Implemented

### Server Security

- **Helmet.js**: Security headers and CSP
- **Rate limiting**: 100 requests/15min, 10 uploads/5min
- **Input validation**: File type, size, and content validation
- **CORS**: Restricted to specific origins
- **File cleanup**: Automatic cleanup of uploaded files
- **Error handling**: Secure error messages in production

### File Upload Security

- **File type validation**: Only audio files allowed
- **Size limits**: 50MB maximum file size
- **Secure filenames**: Generated with timestamps and random strings
- **Automatic cleanup**: Files deleted after processing
- **Path traversal protection**: Secure file storage

### API Security

- **Input sanitization**: All user inputs validated and sanitized
- **Environment validation**: Checks for proper API key configuration
- **Timeout handling**: Prevents hanging requests
- **Circuit breaker**: Fallback when external APIs fail

## 🛡️ Security Best Practices

### Environment Variables

- Never commit `.env` files to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Monitor API key usage for unusual activity

### Production Deployment

- Set `NODE_ENV=production`
- Use HTTPS only
- Configure proper CORS origins
- Set up monitoring and logging
- Use a reverse proxy (nginx/Apache)
- Enable firewall rules

### File Handling

- Regularly clean up old files in uploads/
- Monitor disk usage
- Consider using cloud storage for production
- Implement virus scanning for uploaded files

## 🚨 Incident Response

If you suspect a security breach:

1. **Immediately revoke all API keys**
2. **Check server logs for suspicious activity**
3. **Review recent commits for exposed secrets**
4. **Update all credentials**
5. **Monitor API usage for unusual patterns**

## 📋 Security Checklist

- [ ] API keys revoked and regenerated
- [ ] Environment file updated with new keys
- [ ] `.gitignore` properly configured
- [ ] Git history cleaned of exposed secrets
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] File upload security enabled
- [ ] Error handling secured
- [ ] CORS properly configured
- [ ] Security headers enabled

## 🔍 Regular Security Tasks

### Weekly

- [ ] Review server logs for suspicious activity
- [ ] Check for dependency updates with security patches
- [ ] Monitor API key usage

### Monthly

- [ ] Rotate API keys
- [ ] Review and update security configurations
- [ ] Clean up old uploaded files
- [ ] Update dependencies

### Quarterly

- [ ] Security audit of codebase
- [ ] Penetration testing
- [ ] Review access controls
- [ ] Update security documentation
