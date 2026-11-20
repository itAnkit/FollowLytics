package com.followlytics.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Forwards non-API and non-static asset routes to index.html for React Single Page App routing.
 */
@Component
public class SpaWebFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        // Pass through API, Swagger, H2 console, and static assets with file extensions
        if (path.startsWith("/api") ||
            path.startsWith("/swagger-ui") ||
            path.startsWith("/v3/api-docs") ||
            path.startsWith("/h2-console") ||
            path.contains(".")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Forward SPA client-side routes to index.html
        request.getRequestDispatcher("/index.html").forward(request, response);
    }
}
