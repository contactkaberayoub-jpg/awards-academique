package com.awardsacademique.authentification.service.interfaces;

import com.awardsacademique.authentification.dto.request.ChangePasswordRequest;
import com.awardsacademique.authentification.dto.request.ForgotPasswordRequest;
import com.awardsacademique.authentification.dto.request.InstructorRegisterRequest;
import com.awardsacademique.authentification.dto.request.LoginRequest;
import com.awardsacademique.authentification.dto.request.RegisterRequest;
import com.awardsacademique.authentification.dto.request.ResetPasswordRequest;
import com.awardsacademique.authentification.dto.request.UpdateProfileRequest;
import com.awardsacademique.authentification.dto.response.AuthResponse;

import java.util.Map;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse registerInstructor(InstructorRegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse getCurrentUser(String email);

    AuthResponse updateProfile(String email, UpdateProfileRequest request);

    void changePassword(String email, ChangePasswordRequest request);

    void logout(String jwt);

    AuthResponse refreshToken(String email);

    Map<String, String> forgotPassword(ForgotPasswordRequest request);

    Map<String, String> resetPassword(ResetPasswordRequest request);

    AuthResponse verifyEmail(String token);

    Map<String, String> resendVerification(String email);
}