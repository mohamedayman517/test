// const mongoose = require('mongoose');
// const User = require('../models/userSchema');

// async function updateUsers() {
//   try {
//     // Connect to your MongoDB database
//     await mongoose.connect('mongodb://localhost:27017/your_database_name', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true
//     });

//     // Get all users
//     const users = await User.find({});

//     // Update each user with a customId
//     for (const user of users) {
//       if (!user.customId) {
//         // Generate a unique string ID
//         const customId = Math.random().toString(36).substring(2, 15) + 
//                         Math.random().toString(36).substring(2, 15);
        
//         user.customId = customId;
//         await user.save();
//         console.log(`Updated user ${user._id} with customId: ${customId}`);
//       }
//     }

//     console.log('All users updated successfully');
//     process.exit(0);
//   } catch (error) {
//     console.error('Error updating users:', error);
//     process.exit(1);
//   }
// }

// updateUsers(); 