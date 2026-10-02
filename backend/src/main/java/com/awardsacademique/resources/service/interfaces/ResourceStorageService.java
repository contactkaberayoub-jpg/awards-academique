package com.awardsacademique.resources.service.interfaces;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface ResourceStorageService {

    String store(MultipartFile file);

    void deleteIfManaged(String fileUrl);

    Resource load(String filename);
}
