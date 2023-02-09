const mongoose = require('mongoose');
const schema  = mongoose.Schema;

const emailVerificationSchema = new schema({
    account_id : {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Database Exception. Account Id is required'],
        ref: "account",
        unique: true,    
    },
    token: {
        type: String,
        required: [true, 'Database Exception. Token is required'],
    },
}, {
    timestamps: true
});


const Verification = mongoose.model('verification', emailVerificationSchema);

module.exports = Verification;