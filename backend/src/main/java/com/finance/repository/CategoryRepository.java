package com.finance.repository;

import com.finance.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByType(String type);
    boolean existsByNameAndType(String name, String type);
    boolean existsByNameAndTypeAndUserIsNull(String name, String type);
    Optional<Category> findByUserIdAndSourceCategoryId(Long userId, Long sourceCategoryId);
    void deleteByUserId(Long userId);

    @Query("""
        select c from Category c
        where (c.hidden = false or c.hidden is null)
          and (
            c.user.id = :userId
            or (
              c.user is null
              and c.id not in (
                select userCategory.sourceCategoryId
                from Category userCategory
                where userCategory.user.id = :userId
                  and userCategory.sourceCategoryId is not null
              )
            )
          )
        order by c.type asc, c.name asc
        """)
    List<Category> findVisibleForUser(Long userId);
}
