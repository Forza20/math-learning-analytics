-- One row per error type, in the order silver applies the rules.

select
    error_type,
    rule_order,
    label,
    description,
    example,
    error_type in ('carry_borrow', 'reversed_digits', 'wrong_operation', 'table_neighbor')
        as is_systematic
from {{ ref('error_types') }}
