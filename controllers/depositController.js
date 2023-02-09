const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const { uniqueId, } = require("lodash");
const mongoose = require("mongoose");
const Account = require("../models/accountModel");
const Transaction = require("../models/transactionModel");
const jwt = require("jsonwebtoken");

const NodeCache = require("node-cache");
const myCache = new NodeCache();

const Flutterwave = require("flutterwave-node-v3");
const { cloneDeep } = require("lodash");
const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY
);
// const flw = "";

const charge = asyncHandler(async (req, res) => {
  const body_payload = req.body;

  const flashpay_transaction = {
    sender_id: body_payload.sender_id,
    narration: body_payload.narration,
    previous_balance: body_payload.current_balance,
    type: "Deposit",
    amount: body_payload.amount,
  };

  // tokenize this receipt
  const receipt_details_token = await generateJWTToken(flashpay_transaction);

  const payload = {
    card_number: body_payload.card_number,
    cvv: body_payload.cvv,
    expiry_month: body_payload.expiry_month,
    expiry_year: body_payload.expiry_year,
    currency: "NGN",
    amount: body_payload.amount,
    email: body_payload.email,
    fullname: body_payload.fullname,
    // Generate a unique transaction reference
    tx_ref: Date.now(),
    redirect_url: process.env.APP_BASE_URL + "/pay/redirect",
    enckey: process.env.FLW_ENCRYPTION_KEY,
    meta: {
      receipt_token: receipt_details_token,
    },
  };

  try {
    const response = await flw.Charge.card(payload);
    console.log("charge response");
    console.log(response);

    // first check if theres an error
    if (response.status === "error") {
      return res.status(500).send({
        status: response.status,
        message: response.message,
      });
    }

    switch (response?.meta?.authorization?.mode) {
      case "pin":
      case "avs_noauth":
        // Store the current payload
        const cache = {
          charge_payload: cloneDeep(payload),
          auth_fields: cloneDeep(response.meta.authorization.fields),
          auth_mode: cloneDeep(response.meta.authorization.mode),
        };
        myCache.set(body_payload.sender_id, cache);

        return res.status(200).send({
          mode: cache.auth_mode,
          fields: cache.auth_fields,
          message: "",
        });

      case "redirect":
        // Store the transaction ID
        // so we can look it up later with the flw_ref
        // await redis.setAsync(`txref-${response.data.tx_ref}`, response.data.id);
        // // Auth type is redirect,
        // // so just redirect to the customer's bank
        // const authUrl = response.meta.authorization.redirect;
        // return res.redirect(authUrl);
        return res.status(200).send({
          mode: "redirect",
          message: "Redrecting to users bank",
        });
      default:
        // No authorization needed; just verify the payment
        const transactionId = response.data.id;
        const verify_response = await flw.Transaction.verify({
          id: transactionId,
        });
        req.data = {
          initial_response: response,
          verify_response: verify_response,
        };
        saveTransaction(req, res);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      status: "error",
      message: "There was an internal server error.",
      error: error,
    });
  }
});

// The route where we send the user's auth details (Step 4)
// Avs_noauth or pin calls this post method

// Authorization The Card
const authorize = asyncHandler(async (req, res) => {
  const cache = myCache.get(req.body.sender_id);
  // console.log("cache payload");
  // console.log(cache);
  let payload = cloneDeep(cache.charge_payload);
  // Add the auth mode and requested fields to the payload,
  // then call chargeCard again
  payload.authorization = {
    mode: cache.auth_mode,
  };

  cache.auth_fields.forEach((field) => {
    // payload.authorization.field = req.body[field];
    payload.authorization.pin = req.body.pin;
  });

  console.log("new charge payload");
  console.log(payload);

  const response = await flw.Charge.card(payload);

  if (response.status === "error") {
    return "error";
  }
  console.log("authorize response");
  console.log(response);

  switch (response?.meta?.authorization?.mode) {
    case "otp":
      // store the flw_ref, id and tx_ref in a cache for later use
      const new_cache = {
        id: response?.data?.id,
        flw_ref: response?.data?.flw_ref,
        tx_ref: response?.data?.tx_ref,
      };

      // NOTE!!! sender id string should be gotten from req.body.sender_id
      myCache.set(req.body.sender_id, new_cache);

      // return the response back to client
      return res.status(200).send({
        mode: "otp",
        message: response.data.processor_response,
      });

    case "redirect":
      const authUrl = response.meta.authorization.redirect;
      return res.status(200).send({
        mode: "redirect",
        url: authUrl,
        message: response.data.processor_response,
      });
    default:
      // No validation needed; just verify the payment
      const transactionId = response.data.id;
      const verify_response = await flw.Transaction.verify({
        id: transactionId,
      });
      req.data = {
        initial_response: response,
        verify_response: verify_response,
      };
      saveTransaction(req, res);
  }
});

const validate = asyncHandler(async (req, res) => {
  // First get the cached data...the flw_ref, tx_ref, and id
  const cache = myCache.get(req.body.sender_id);
  // console.log("validate cache payload");
  // console.log(cache);

  // validate otp using the flw_ref from the cache
  const response = await flw.Charge.validate({
    otp: req.body.otp,
    flw_ref: cache.flw_ref,
  });
  // console.log("validate response");
  // console.log(response);

  // Verify the payment
  const transactionId = response.data.id;
  const verify_response = await flw.Transaction.verify({ id: transactionId });
  req.data = {
    initial_response: response,
    verify_response: verify_response,
  };
  saveTransaction(req, res);
});

// This will be called on two occassions
// one fro the 3ds mode init from the initial charge
// two from the redirect response after authorizing the card either by otp or card billing address
const redirectHandler = asyncHandler(async (req, res) => {
  if (req.query.status === "successful" || req.query.status === "pending") {
    // Verify the payment
    const txRef = req.query.tx_ref;
    // const transactionId = await redis.getAsync(`txref-${txRef}`);
    const transactionId = "";
    const transaction = flw.Transaction.verify({ id: transactionId });
    if (transaction.data.status == "successful") {
      // store the transaction in mongodb as successful and
      // update the wallet balance of the user
      // make sure you inclued the transaction id and flw-ref
      //in the mongodb doc to be stored
      return res.status(200).send({
        status: "success",
        message: "Deposit Transaction Successful.",
      });
    } else if (transaction.data.status == "pending") {
      // // Schedule a job that polls for the status of the payment every 10 minutes
      // transactionVerificationQueue.add({ id: transactionId });

      // store the transaction in mongodb as pending
      //  but do not update the wallet balance of the user
      // store the transaction in mongodb as successful and
      // update the wallet balance of the user
      // make sure you inclued the transaction id and flw-ref
      //in the mongodb doc to be stored

      return res.status(200).send({
        status: "pending",
        message: "Deposit Transaction Pending.",
      });
    }
  }

  return res.status(200).send({
    status: "failed",
    message: "Deposit Transaction Failed.",
  });
});

const saveTransaction = asyncHandler(async (req, res) => {
  const response = req.data.initial_response;
  const verify_response = req.data.verify_response;

  console.log("verify response");
  console.log(verify_response);

  // configure the message depending on the status of the transaction
  let message = "";
  if (verify_response.data.status == "successful") {
    message =
      "You have successfully made a deposit to your wallet. Please confirm by checking your balance";
  } else if (verify_response.data.status == "pending") {
    // Schedule a job that polls for the status of the payment every 10 minutes
    message =
      "Please wait while we process your deposit. You'll be notified of its status once its complete";
  } else {
    message = "Your deposit was not successful. Do you want to retry again?";
  }

  // Set the recepit/ transaction payload to be stored in mongodb
  // get the receipt token and decode it back to object
  const receipt_token = verify_response.data.meta.receipt_token;

  let payload = jwt.verify(receipt_token, process.env.JWT_SECRET);
  console.log("decoded payload");
  console.log(payload);

  let receipt_payload = {
    transaction_id: response?.data?.id,
    transaction_ref: response.data.flw_ref,
    tx_ref: response.data.tx_ref,
    ...payload, //// gotten from the flw meta
    datetime: new Date(),
    status: verify_response.data.status,
  };

  // TRANSACTION

  // Store recepit/transaction copy of in our database
  const receipt_doc = new Transaction(receipt_payload);
  const result = await receipt_doc.save();

  console.log("transaction response");
  console.log(result);

  // Update the wallet balance of the user if the status of the transaction is successful
  let new_balance = null;
  if (verify_response.data.status === "successful") {
    // new_balance = payload.current_balance + payload.amount; /// prev balance otten from the meta
    const updates = {
      balance: new_balance,
    };
    const balance_result = await Account.findByIdAndUpdate(
      payload.sender_id,
      updates,
      {
        new: true,
      }
    );
  }
  if (!result) {
    // saving transaction in database failed
    // return the flutterwave status message instead
    // return the copy of the transaction if it was successful...this is to be stored in the frontend cache so that we can
    // make periodic request to retry storing it again in mongodb
    result.retry = true; /// check this flag in the frontned if the saing the data in database failed
    return res.status(200).send({
      status: verify_response.data.status,
      message: message,
      data: null,
    });
  }

  return res.status(200).send({
    status: verify_response.status,
    message: message,
    data: result,
  });
});

const generateJWTToken = async (id) => {
  return jwt.sign(id, process.env.JWT_SECRET);
};

module.exports = {
  charge,
  authorize,
  validate,
  redirectHandler,
};
