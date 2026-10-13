# Test Credentials

## Lawyer Portal (email/password + JWT)
- URL: /lawyer/login
- Email: aabbbd12341234@gmail.com
- Password: 20022026

## Client Portal (Emergent Google Auth)
- URL: /client/login
- Uses Emergent-managed Google Auth. Client account must be pre-added by lawyer
  (matching email) before Google login can grant access.
- For testing, manually insert a test client with a real gmail into `clients` collection
  and log in via Google using that gmail.
