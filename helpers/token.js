const jwt = require('jsonwebtoken')

function generateToken({ payload, type = 'access' }) {
  const config = {
    access: { 
      secret: process.env.ACCESS_SECRET,
      expiresIn: '15m' 
    },
    refresh: { 
      secret: process.env.REFRESH_SECRET, 
      expiresIn: '7d' 
    }
  }
    
  const { secret, expiresIn } = config[type] || config.access
    
  if (!secret) throw new Error(`JWT Secret for ${type} is not configured`)
    
    return jwt.sign(payload, secret, { expiresIn })
  }

module.exports = generateToken