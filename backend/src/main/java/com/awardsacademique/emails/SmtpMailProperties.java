package com.awardsacademique.emails;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * SMTP configuration bound from environment variables. On reload the binding
 * itself maps the {@code spring.mail.*} properties normally, so the SMTP host,
 * port, username and app password are all taken from the environment and never
 * hard-coded.
 *
 * Expected variables:
 * <pre>
 *   MAIL_HOST        = smtp.gmail.com
 *   MAIL_PORT        = 587
 *   MAIL_USERNAME    = your-gmail@gmail.com
 *   MAIL_APP_PASSWORD= 16-character app password
 * </pre>
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "spring.mail")
public class SmtpMailProperties {
    private String host = "smtp.gmail.com";
    private int port = 587;
    private String username;
    private String password;
    private boolean auth = true;
    private boolean startTlsEnable = true;
}