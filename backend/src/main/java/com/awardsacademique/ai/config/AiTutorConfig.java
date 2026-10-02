package com.awardsacademique.ai.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AiTutorProperties.class)
public class AiTutorConfig {
}