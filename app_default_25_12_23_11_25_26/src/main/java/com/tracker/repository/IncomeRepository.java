package com.tracker.repository;

import com.tracker.model.Income;
import com.tracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface IncomeRepository extends JpaRepository<Income, Long> {
    List<Income> findByUser(User user);
    List<Income> findByUserAndDateBetween(User user, LocalDate startDate, LocalDate endDate);
}
