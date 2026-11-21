package com.followlytics.repository;

import com.followlytics.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByDealIdOrderByTimestampAsc(Long dealId);

    @Query("SELECT m.dealId, COUNT(m) FROM ChatMessage m WHERE m.dealId IN :dealIds GROUP BY m.dealId")
    List<Object[]> countMessagesByDealIds(@Param("dealIds") List<Long> dealIds);
}
