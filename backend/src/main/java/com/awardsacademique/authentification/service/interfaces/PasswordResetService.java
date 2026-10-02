package com.awardsacademique.authentification.service.interfaces;

import java.util.Map;

public interface PasswordResetService {

    Map<String, String> forgotPassword(String email);

    Map<String, String> resetPassword(String token, String newPassword, String confirmPassword);
}