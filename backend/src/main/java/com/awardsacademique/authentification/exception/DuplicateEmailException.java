package com.awardsacademique.authentification.exception;

public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String email) {
        super("An account with this email is already registered: " + email);
    }
}
