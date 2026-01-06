package com.tracker.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashMap;
import java.util.Map;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Budget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double dailyLimit = 0.0;
    private Double monthlyLimit = 0.0;

    @ElementCollection
    @CollectionTable(name = "budget_category_limits", joinColumns = @JoinColumn(name = "budget_id"))
    @MapKeyColumn(name = "category")
    @Column(name = "limit_value")
    private Map<String, Double> categoryLimits = new HashMap<>();

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    public Map<String, Double> getCategoryLimits() {
        return categoryLimits;
    }

    public void setCategoryLimits(Object categoryLimits) {
        if (categoryLimits instanceof Map) {
            this.categoryLimits = (Map<String, Double>) categoryLimits;
        } else {
            throw new IllegalArgumentException("categoryLimits must be a Map<String, Double>");
        }
    }
}
