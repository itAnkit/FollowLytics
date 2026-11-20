package com.followlytics.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI followLyticsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FollowLytics API")
                        .description("REST API documentation for FollowLytics: WhatsApp Commerce Intelligence, Catalog Management, AI Chat Assistant & Analytics Engine.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("FollowLytics Team")
                                .url("http://localhost:5173")));
    }
}
