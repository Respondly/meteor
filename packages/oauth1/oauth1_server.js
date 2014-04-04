// connect middleware
Oauth._requestHandlers['1'] = function (service, query, res) {

  var config = ServiceConfiguration.configurations.findOne({service: service.serviceName});
  if (!config) {
    throw new ServiceConfiguration.ConfigError("Service " + service.serviceName + " not configured");
  }

  var urls = service.urls;
  var oauthBinding = new OAuth1Binding(config, urls);

  if (query.requestTokenAndRedirect) {
    // step 1 - get and store a request token
    var callbackUrl = Meteor.absoluteUrl("_oauth/twitter?close&state=" +
                                         query.state);

    requestTokenOptions = {};
    if(query.requestTokenOptions) {
      var requestTokenParamNames = query.requestTokenOptions.split(',');
      _.each(requestTokenParamNames, function(paramName) {
        requestTokenOptions[paramName] = query[paramName];
      });
    }

    // Get a request token to start auth process
    oauthBinding.prepareRequestToken(requestTokenOptions, callbackUrl);

    // Keep track of request token so we can verify it on the next step
    Oauth._storeRequestToken(query.state,
      oauthBinding.requestToken,
      oauthBinding.requestTokenSecret
    );

    // support for scope/name parameters
    var redirectUrl = undefined;
    if(typeof urls.authenticate === "function") {
      redirectUrl = urls.authenticate(oauthBinding);
    } else {
      redirectUrl = urls.authenticate + '?oauth_token=' + oauthBinding.requestToken;
    }

    // redirect to provider login, which will redirect back to "step 2" below
    var redirectUrl = urls.authenticate + '?oauth_token=' + oauthBinding.requestToken;

    // Add any pass through parameters to the URL
    if (query.authenticationOptions) {
      var authenticationOptionParamNames = query.authenticationOptions.split(',');
      _.each(authenticationOptionParamNames, function(paramName) {
        redirectUrl += '&' + paramName + '=' + query[paramName];
      });
    }

    res.writeHead(302, {'Location': redirectUrl});
    res.end();
  } else {
    // step 2, redirected from provider login - store the result
    // and close the window to allow the login handler to proceed

    // Get the user's request token so we can verify it and clear it
    var requestTokenHolder = Oauth._retrieveRequestToken(query.state);

    // Verify user authorized access and the oauth_token matches
    // the requestToken from previous step
    if (query.oauth_token && query.oauth_token === requestTokenHolder.requestToken) {

      // Prepare the login results before returning.  This way the
      // subsequent call to the `login` method will be immediate.

      // Get the access token for signing requests
      oauthBinding.prepareAccessToken(query, requestTokenHolder.requestTokenSecret);

      // Run service-specific handler.
      var oauthResult = service.handleOauthRequest(oauthBinding);

      // Store the login result so it can be retrieved in another
      // browser tab by the result handler
      Oauth._storePendingCredential(query.state, {
        serviceName: service.serviceName,
        serviceData: oauthResult.serviceData,
        options: oauthResult.options
      });
    }

    // Either close the window, redirect, or render nothing
    // if all else fails
    Oauth._renderOauthResults(res, query);
  }
};
