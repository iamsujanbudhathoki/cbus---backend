export const regex = {
  // Password: at least 1 lowercase, 1 uppercase, 1 digit, 1 special char, min 8 length
  PASSWORD_REGEX:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/,
};
