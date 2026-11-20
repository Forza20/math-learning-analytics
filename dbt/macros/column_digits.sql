{#- Column-by-column arithmetic on up to 4-digit numbers, without carrying
    or borrowing. Models the classic written-method mistakes:
      add_no_carry:   47 + 38 -> 75 (each column keeps only its last digit)
      sub_no_borrow:  52 - 17 -> 45 (each column takes smaller from larger)
    Matches carry_borrow() in simulator/errors.py. -#}
{% macro column_digits(a, b, op) -%}
(
{%- for k in range(4) %}
    {%- set p = 10 ** k %}
    {%- if op == 'add_no_carry' %}
    ((({{ a }} / {{ p }}) % 10 + ({{ b }} / {{ p }}) % 10) % 10) * {{ p }}
    {%- elif op == 'sub_no_borrow' %}
    abs(({{ a }} / {{ p }}) % 10 - ({{ b }} / {{ p }}) % 10) * {{ p }}
    {%- else %}
    {{ exceptions.raise_compiler_error("column_digits: unknown op " ~ op) }}
    {%- endif %}
    {%- if not loop.last %} +{% endif %}
{%- endfor %}
)
{%- endmacro %}
