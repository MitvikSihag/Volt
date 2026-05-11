package com.volt.common.storage;

import com.volt.common.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalStorageService implements StorageService {

    private final String uploadDir;
    private final String baseUrl;

    public LocalStorageService(
            @Value("${volt.storage.upload-dir:uploads}") String uploadDir,
            @Value("${volt.storage.base-url:http://localhost:8080/uploads}") String baseUrl) {
        this.uploadDir = uploadDir;
        this.baseUrl = baseUrl;
    }

    @Override
    public String store(MultipartFile file, String folder) {
        try {
            String filename = UUID.randomUUID() + safeExtension(file.getContentType());
            Path dir = Paths.get(uploadDir, folder);
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(filename));
            return baseUrl + "/" + folder + "/" + filename;
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }
    }

    @Override
    public void delete(String url) {
        if (url == null || !url.startsWith(baseUrl)) return;
        try {
            Path path = Paths.get(uploadDir, url.substring(baseUrl.length()));
            Files.deleteIfExists(path);
        } catch (IOException e) {
            // non-critical — stale file, log in production
        }
    }

    private String safeExtension(String contentType) {
        if (contentType == null) return "";
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> "";
        };
    }
}
