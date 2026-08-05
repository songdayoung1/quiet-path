package kr.co.quietpath.api.auth.security;

import jakarta.servlet.ServletException;
import kr.co.quietpath.api.auth.UserPrincipal;
import kr.co.quietpath.domain.auth.entity.RefreshTokenSession;
import kr.co.quietpath.domain.auth.repository.RefreshTokenSessionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RefreshTokenSessionRepository refreshTokenSessionRepository;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_withActiveSession_authenticatesUser() throws ServletException, IOException {
        RefreshTokenSession session = RefreshTokenSession.issue(1L, "session-1", "hash-1", 300L);
        when(jwtTokenProvider.validate("access-token")).thenReturn(true);
        when(jwtTokenProvider.parseUserId("access-token")).thenReturn(1L);
        when(jwtTokenProvider.parseSessionId("access-token")).thenReturn("session-1");
        when(refreshTokenSessionRepository.findByUserIdAndSessionId(1L, "session-1"))
            .thenReturn(Optional.of(session));

        filter.doFilter(requestWithToken(), new MockHttpServletResponse(), new MockFilterChain());

        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserPrincipal userPrincipal = assertInstanceOf(UserPrincipal.class, principal);
        assertEquals(1L, userPrincipal.getUserId());
        assertEquals("session-1", userPrincipal.getSessionId());
    }

    @Test
    void doFilter_afterSessionDeletion_doesNotAuthenticateUser() throws ServletException, IOException {
        when(jwtTokenProvider.validate("access-token")).thenReturn(true);
        when(jwtTokenProvider.parseUserId("access-token")).thenReturn(1L);
        when(jwtTokenProvider.parseSessionId("access-token")).thenReturn("session-1");
        when(refreshTokenSessionRepository.findByUserIdAndSessionId(1L, "session-1"))
            .thenReturn(Optional.empty());

        filter.doFilter(requestWithToken(), new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilter_withInvalidJwt_skipsSessionLookup() throws ServletException, IOException {
        when(jwtTokenProvider.validate("access-token")).thenReturn(false);

        filter.doFilter(requestWithToken(), new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(refreshTokenSessionRepository, never()).findByUserIdAndSessionId(1L, "session-1");
    }

    private MockHttpServletRequest requestWithToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer access-token");
        return request;
    }
}
