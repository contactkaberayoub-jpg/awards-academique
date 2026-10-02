package com.awardsacademique.authentification.service.interfaces;

import com.awardsacademique.authentification.dto.response.UserSearchResponse;

import java.util.List;

public interface UserService {

    List<UserSearchResponse> search(String q, String role);
}
