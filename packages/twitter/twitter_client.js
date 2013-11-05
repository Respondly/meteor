Twitter = {};

// Request Twitter credentials for the user
// @param options {optional Object} with fields:
// - requestPermissions {'read' or 'write'}
//     Request a specific permission level from Twitter (Twitter's x_auth_access_type)
//     If you nead RWD, leave this blank, and configure it in your Twitter app config
// - forceLogin {Boolean}
//     If true, tells Twitter to prompt for a new login
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Twitter.requestCredential = function (options, credentialRequestCompleteCallback) {
  // Support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  // If options is null or undefined, default it to an empty object
  if(!options)
    options = {};

  var config = ServiceConfiguration.configurations.findOne({service: 'twitter'});
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError());
    return;
  }

  var credentialToken = Random.secret();
  // We need to keep credentialToken across the next two 'steps' so we're adding
  // a credentialToken parameter to the url and the callback url that we'll be returned
  // to by oauth provider

  var loginStyle = OAuth._loginStyle('twitter', config, options);

  // url to app, enters "step 1" as described in
  // packages/accounts-oauth1-helper/oauth1_server.js
  var loginPath = '_oauth/twitter/?requestTokenAndRedirect=true'
        + '&state=' + OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl);

  if (Meteor.isCordova) {
    loginPath = loginPath + "&cordova=true";
    if (/Android/i.test(navigator.userAgent)) {
      loginPath = loginPath + "&android=true";
    }
  }

  var loginUrl = Meteor.absoluteUrl(loginPath);


  // Prepare authentication options
  var authenticationOptions = [];

  if (options.forceLogin === true) {
    loginUrl += '&force_login=true';
    authenticationOptions.push('force_login');
  }

  if (authenticationOptions.length > 0)
    loginUrl += '&authenticationOptions=' + authenticationOptions.join(',');

  // Prepare request token options
  var requestTokenOptions = [];

  if (options.requestPermissions) {
    loginUrl += '&x_auth_access_type=' + options.requestPermissions;
    requestTokenOptions.push('x_auth_access_type');
  }

  if (requestTokenOptions.length > 0)
    loginUrl += '&requestTokenOptions=' + requestTokenOptions.join(',');

  // Initiate the login
  OAuth.launchLogin({
    loginService: "twitter",
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken
  });

};
