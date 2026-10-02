package com.awardsacademique.authentification.service.interfaces;

import com.awardsacademique.authentification.dto.response.AuthResponse;

public interface GoogleOAuthService {

    String buildAuthorizationUrl(String state);

    String createStateToken();

    void validateStateToken(String stateToken);

    String handleCallbackAndCreateOneTimeCode(String authorizationCode);

    AuthResponse exchangeOneTimeCode(String oneTimeCode);

    String getFrontendCallbackUrl();
}