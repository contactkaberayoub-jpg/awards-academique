package com.awardsacademique.authentification.controller;

import com.awardsacademique.authentification.dto.response.UserSearchResponse;
import com.awardsacademique.authentification.service.interfaces.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role
    ) {
        return ResponseEntity.ok(userService.search(q, role));
    }
}
