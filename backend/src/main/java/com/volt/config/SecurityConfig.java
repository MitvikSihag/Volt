package com.volt.config;

import com.volt.user.CustomUserDetailsService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final CustomUserDetailsService userDetailsService;
    private final RateLimitFilter rateLimitFilter;
    private final boolean h2Console;
    private final List<String> corsOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          CustomUserDetailsService userDetailsService,
                          RateLimitFilter rateLimitFilter,
                          @Value("${spring.h2.console.enabled:false}") boolean h2Console,
                          @Value("${volt.cors.allowed-origins}") List<String> corsOrigins) {
        this.jwtFilter = jwtFilter;
        this.userDetailsService = userDetailsService;
        this.rateLimitFilter = rateLimitFilter;
        this.h2Console = h2Console;
        this.corsOrigins = corsOrigins;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())
                        .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    // Must precede the /api/auth/** permitAll below — first match wins.
                    auth.requestMatchers("/api/auth/verify/request").authenticated();
                    // Must precede the {username} wildcard below — "me" would otherwise match it and
                    // become publicly readable instead of requiring authentication.
                    auth.requestMatchers(HttpMethod.GET, "/api/users/me").authenticated();
                    // Only open in profiles where the H2 console is actually enabled (never on postgres/prod).
                    if (h2Console) {
                        auth.requestMatchers("/h2-console/**").permitAll();
                    }
                    auth.requestMatchers(
                                    "/api/auth/**",
                                    "/uploads/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html",
                                    "/v3/api-docs/**",
                                    "/v3/api-docs.yaml",
                                    "/actuator/health"
                            ).permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/users/{username}").permitAll()
                            .anyRequest().authenticated();
                })
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write(
                                    "{\"status\":401,\"message\":\"Unauthorized\",\"timestamp\":\"" + Instant.now() + "\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write(
                                    "{\"status\":403,\"message\":\"Access denied\",\"timestamp\":\"" + Instant.now() + "\"}");
                        })
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        // Google-only accounts have no password: reject them on the password path only,
        // hidden as "Bad credentials". The JWT filter still loads them normally.
        provider.setUserDetailsService(username -> {
            UserDetails details = userDetailsService.loadUserByUsername(username);
            if (details.getPassword().isEmpty()) {
                throw new UsernameNotFoundException("No password set for: " + username);
            }
            return details;
        });
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
