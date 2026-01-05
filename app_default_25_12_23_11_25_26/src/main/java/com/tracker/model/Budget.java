package com.tracker.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Budget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Double dailyLimit = 0.0;
    private Double monthlyLimit = 0.0;
    
    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    public Object getCategoryLimits() {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getCategoryLimits'");
    }

    public void setCategoryLimits(Object categoryLimits) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'setCategoryLimits'");
    }
}
