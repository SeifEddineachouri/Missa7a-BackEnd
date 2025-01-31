const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const User = require("../models/User");

// @desc        Get all users
// @route       GET api/v1/users
// @access      Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc        Get single user
// @route       GET api/v1/users/:id
// @access      Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc        Create user
// @route       POST api/v1/users
// @access      Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const { Prenom, Nom, cin, avatar, email, role, password } = req.body;
  const url = req.protocol + "://" + req.get("host");

  const user = await User.create({
    Prenom,
    Nom,
    cin,
    avatar: url + "/public/images/" + req.file.filename,
    email,
    role,
    password,
  });

  res.status(201).json({
    success: true,
    data: user,
  });
});

// @desc        Update user
// @route       PUT api/v1/users/:id
// @access      Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc        Delete user
// @route       DELETE api/v1/users/:id
// @access      Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    data: [],
  });
});
