const mongoose = require('mongoose');
const User = require('../models/User');
const Form = require('../models/Form');

/**
 * Migration script to fix forms that don't have the correct facebookAppId
 * This script will:
 * 1. Find all forms that don't have facebookAppId set
 * 2. Associate them with the user's first available Facebook app
 * 3. Update the forms in the database
 */
async function migrateForms() {
  try {
    console.log('Starting form migration...');
    
    // Find all forms that don't have facebookAppId set
    const formsWithoutAppId = await Form.find({ 
      facebookAppId: { $exists: false } 
    }).populate('userId');
    
    console.log(`Found ${formsWithoutAppId.length} forms without facebookAppId`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const form of formsWithoutAppId) {
      try {
        const user = form.userId;
        
        if (!user) {
          console.log(`Skipping form ${form.formId} - user not found`);
          skippedCount++;
          continue;
        }
        
        // Find the user's first available Facebook app
        let targetApp = null;
        
        if (user.facebookApps && user.facebookApps.length > 0) {
          targetApp = user.facebookApps[0];
        }
        
        if (!targetApp) {
          console.log(`Skipping form ${form.formId} - no Facebook apps found for user ${user._id}`);
          skippedCount++;
          continue;
        }
        
        // Update the form with the correct facebookAppId
        await Form.findByIdAndUpdate(form._id, {
          facebookAppId: targetApp._id.toString()
        });
        
        console.log(`Updated form ${form.formId} with app ${targetApp.appName} (${targetApp._id})`);
        updatedCount++;
        
      } catch (error) {
        console.error(`Error updating form ${form.formId}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`Migration completed: ${updatedCount} forms updated, ${skippedCount} forms skipped`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fb-leads';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateForms();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateForms }; 