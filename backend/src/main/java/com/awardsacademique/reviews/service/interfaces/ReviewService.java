package com.awardsacademique.reviews.service.interfaces;

import com.awardsacademique.reviews.dto.request.CreateReviewRequest;
import com.awardsacademique.reviews.dto.request.UpdateReviewRequest;
import com.awardsacademique.reviews.dto.response.ReviewResponse;

import java.util.List;
import java.util.UUID;

public interface ReviewService {

    ReviewResponse create(CreateReviewRequest request);

    List<ReviewResponse> getMine();

    List<ReviewResponse> getByCourse(UUID courseId);

    List<ReviewResponse> getAll();

    ReviewResponse update(UUID id, UpdateReviewRequest request);

    void delete(UUID id);
}
