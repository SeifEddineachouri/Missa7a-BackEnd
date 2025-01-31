const crypto = require("crypto");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// @desc        Register user
// @route       POST api/v1/auth/register
// @access      public
exports.register = asyncHandler(async (req, res, next) => {
  const { Prenom, Nom, cin, avatar, email, role, password } = req.body;
  const url = req.protocol + "://" + req.get("host");

  // Create user
  const user = await User.create({
    Prenom,
    Nom,
    cin,
    avatar: url + "/public/images/" + req.file.filename,
    email,
    role,
    password,
  });
  sendTokenResponse(user, 200, res);
});

// @desc        Login user
// @route       POST api/v1/auth/login
// @access      public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(
      new ErrorResponse("Veuillez entrer un email et un mot de passe", 400)
    );
  }

  // Check for user
  const user = await User.findOne({
    email,
  }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Votre e-mail est incorrect", 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Votre mot de passe est incorrect ", 401));
  }
  sendTokenResponse(user, 200, res);
});

// @desc        Log user out / clear cookie
// @route       GET api/v1/auth/logout
// @access      Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc        Get current logged in user
// @route       GET api/v1/auth/me
// @access      private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc        Update user details
// @route       PUT api/v1/auth/updatedetails
// @access      private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    Prenom: req.body.Prenom,
    Nom: req.body.Nom,
    cin: req.body.cin,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc        Update password
// @route       GET api/v1/auth/updatepassword
// @access      private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Le mot de passe est incorrect", 401));
  }
  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc        Forgot password
// @route       POST api/v1/auth/forgotpassword
// @access      public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  if (!user) {
    return next(
      new ErrorResponse("Il n'y a pas d'utilisateur avec cet e-mail", 404)
    );
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({
    validateBeforeSave: false,
  });

  // Create reset url
  const resetUrl = `${req.protocol}://localhost:4200/resetpassword/${resetToken}`;

  const message = `Vous recevez cet e-mail parce que vous (ou quelqu'un d'autre) \n avez demandé la réinitialisation d'un mot de passe.\n Veuillez faire une demande à : \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "demande de réinitialisation du mot de passe",
      message,
    });

    res.status(200).json({
      success: true,
      data: "Veuillez consulter votre boîte mail !",
    });
  } catch (error) {
    console.log(error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    return next(new ErrorResponse("Le mail n'a pas pu être envoyé", 500));
  }
});

// @desc        Reset password
// @route       PUT api/v1/auth/resetpassword/:resettoken
// @access      public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    return next(new ErrorResponse("Token invalide", 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save({
    validateBeforeSave: false,
  });

  sendTokenResponse(user, 200, res);
});

// Get token from model , create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};
