# Magic Squares Lab: Glossary of Definitions

**Purpose:** Establish a precise, source-aware vocabulary for Magic Squares Lab.

This glossary is an original reference for the Lab. It is intended to
translate older recreational terminology into a consistent modern data model,
not to reproduce any existing lexicon. Where terminology varies between
authors, the Lab should name the exact set of required lines or constraints
instead of relying on an ambiguous adjective.

## 1. Lab conventions

The Lab uses:

- **`m`** for order, or side length.
- **`d`** for dimension, or number of axes.
- **`N = m^d`** for the total number of cells in a `d`-dimensional hypercube.
- **`M_d(m) = m(m^d + 1)/2`** for the normal magic constant of a `d`-dimensional object of order `m`.
- **normal** to mean the entries are exactly `1, 2, ..., m^d`, each once.
- **line set** to mean the explicit list of lines whose values are required to satisfy a condition.

The word **perfect** requires a definition of the required
line set. It has not been used consistently across the literature.

## 2. Core terms

### Array

A rectangular arrangement of values indexed by one or more coordinates. A
magic square is a two-dimensional array; a magic hypercube is a higher-
dimensional array.

### Cell

One position in an array, identified by its coordinates and containing one
entry or value.

### Dimension

The number of independent coordinate axes. A square has dimension 2, a cube
has dimension 3, and a tesseract has dimension 4.

### Entry

The number, symbol, or other value placed in a cell.

### Order

The number of cells along each side of a regular square or hypercube. An
order-5 magic square has 5 rows and 5 columns. An order-3, dimension-10
object has `3^10` cells.

### Magic constant / magic sum

The common required sum for each line in a specified magic line set. For a
normal order-`m`, dimension-`d` hypercube:

`M_d(m) = m(m^d + 1)/2`

For an ordinary normal square, this reduces to `m(m^2 + 1)/2`.

### Magic product

The common product required for each line in a multiplicative magic object.
The product may be more useful than a sum when entries are represented through
prime exponents or another multiplicative encoding.

### Normal

Containing every integer from `1` through `m^d` exactly once. In two
dimensions, a normal square contains `1` through `m^2`.

### Non-normal

Any magic object that does not use the normal consecutive set. It may use
arithmetic progressions, primes, powers, symbols, negative integers, or
repeated values, depending on the definition.

### Distinct entries

No two cells contain the same value. A non-normal object can still have
distinct entries.

### Trivial magic object

A broad, source-dependent term for an object whose magic property is produced
by repeated entries, constant values, or another construction that avoids the
usual distinct-entry challenge. The Lab describes the exact reason rather
than using this label alone.

### Magic square

A square array whose specified rows, columns, and two principal diagonals all
have the same sum. In common recreational usage, the entries are also assumed
to be distinct and normal unless stated otherwise.

### Magic cube

A three-dimensional magic hypercube. For a normal order-`m` cube, the axis
lines and the designated space diagonals are tested against the cube's magic
constant.

### Magic hypercube

A regular `d`-dimensional array generalizing a square and cube. The Lab records dimension separately from order, so a 10-dimensional order-3 object is a
**normal magic hypercube of order 3 and dimension 10**, if it uses `1` through
`3^10`.

### Tesseract

A four-dimensional hypercube. A magic tesseract is therefore a dimension-4
magic hypercube, although some authors use the broader term hypercube for all
dimensions above two.

## 3. Lines and geometry

### Line

A selected sequence of cells whose entries are tested together. Every claim
about a magic object must identify which lines are included.

### Axis line

A line parallel to one coordinate axis, with all other coordinates fixed. In a
two-dimensional square these are rows and columns.

### Row

An axis line parallel to the horizontal coordinate direction in a displayed
two-dimensional square.

### Column

An axis line parallel to the vertical coordinate direction in a displayed
two-dimensional square.

### Pillar / file

An axis line in a three- or higher-dimensional object. Different authors use
these terms differently; the Lab prefers **axis line** plus its direction.

### Rook line

An axis line in a multidimensional array, named by analogy with a chess rook.

### Principal diagonal / main diagonal

A diagonal joining opposite corners of a two-dimensional square. There are two
principal diagonals.

### Space diagonal / long diagonal

A line joining opposite extreme corners of a multidimensional hypercube, with
every coordinate changing together by either `+1` or `-1`. A dimension-`d`
hypercube has `2^(d-1)` such diagonals when reversal of a line does not create
a new line.

### Cross-section diagonal

A diagonal lying within a lower-dimensional slice of a hypercube. For example,
the diagonals of each square face of a cube are cross-section diagonals, not
necessarily space diagonals.

### Broken diagonal

A diagonal that exits one edge of a square or hypercube and re-enters through
the opposite edge under a wrap-around convention.

### Pandiagonal / pan-diagonal

A diagonal property requiring the relevant broken diagonals, as well as the
ordinary diagonals, to have the magic sum. The exact directions and wrap-around
rules must be stated.

### Wrap-around

Treating opposite edges as joined. In two dimensions this creates a torus; in
higher dimensions it creates a periodic multidimensional space.

### Direction vector

A coordinate-step description of a line. For a square, `(1, 0)` describes a
row direction and `(1, 1)` a principal diagonal direction. Direction vectors
make higher-dimensional line definitions explicit and machine-checkable.

### Line family

A group of lines sharing a rule, such as all rows, all columns, all long
diagonals, or all broken diagonals in one direction.

### Line set

The complete collection of lines included in a validation claim. Two objects
called “magic cubes” may differ because their authors use different line sets.

## 4. Strength classes

### Semimagic square

A square in which all rows and columns have the same sum, without requiring the
two principal diagonals to do so.

### Ordinary / simple magic square

A semimagic square whose two principal diagonals also have the magic sum, with
no additional claimed properties.

### Magic hypercube, axis-line definition

A hypercube in which every axis line has the magic constant and the selected
long diagonals also have the magic constant. This is the Lab's default basic
hypercube definition.

### Semimagic hypercube

A hypercube in which every axis line has the magic constant, without a diagonal
requirement.

### Perfect magic hypercube

A source-dependent term. It may mean that all nonbroken diagonals of specified
dimensions are magic, or that every cross-section diagonal is magic. The Lab replaces this term with an explicit diagonal line set.

### Pandiagonal hypercube

A hypercube satisfying a stated collection of broken-diagonal requirements in
addition to its axis and ordinary diagonal requirements. There is no single
universal line set implied by the word alone.

### Nasik hypercube

A strong hypercube class traditionally associated with requiring all possible
straight or wrapped line directions to sum correctly. Because authors differ on
which directions qualify, the Lab uses **nasik** only with a line-set
definition.

### Orthogonal magic object

A broad term for a magic object with multiple independent line families or
additional geometric constraints. It is not sufficiently precise to serve as a
validation class by itself.

### Magic torus

A periodic square or higher-dimensional array whose wrap-around line families
are magic. In two dimensions, a toroidal representation is especially useful
for understanding pandiagonal squares.

## 5. Symmetry and complement properties

### Complement

For a normal square, replacing each value `x` with `m^2 + 1 - x`. In dimension
`d`, the normal complement is `m^d + 1 - x`.

### Complementary pair

Two entries whose values sum to the normal complement constant, usually
`m^d + 1`.

### Associative / symmetric magic square

A magic square in which cells paired through the center contain complementary
values. The term **symmetric** is ambiguous in modern mathematical writing, so
the Lab prefers **centrally complementary** when describing the property.

### Centrally complementary

The property that every pair of cells related by a half-turn about the center
has values summing to `m^d + 1` for a normal object.

### Self-complementary

A magic object whose complement is equivalent to the original under an allowed
symmetry, such as rotation, reflection, or a higher-dimensional coordinate
transformation.

### Regular magic square

A historical term often used for an associative or centrally complementary
magic square. The Lab records the actual complement rule instead.

### Symmetry

A transformation that preserves the relevant object or property. For a square,
the usual geometric symmetries are the four rotations and four reflections.

### Dihedral symmetry / `D4`

The eight rotations and reflections of a square. These transformations are the
standard equivalences used when counting ordinary magic squares.

### Hypercube symmetry

The coordinate permutations, coordinate reversals, and their combinations that
preserve a `d`-dimensional hypercube. The full geometric symmetry group is much
larger than the eight symmetries of a square.

### Equivalence

Two objects are equivalent under a declared set of transformations. The Lab does not use “different” without stating whether rotations, reflections,
complements, relabelings, or coordinate permutations have been factored out.

### Orbit

The set of all objects obtained from one object by applying the allowed
equivalence transformations.

### Canonical representative

One selected member of an equivalence class, used so that equivalent objects
can be stored and counted once.

### Frénicle standard form

A conventional canonical orientation for ordinary magic squares, used to
remove rotational and reflective duplication. The exact tie-breaking rule
should be documented by the implementation.

## 6. Named square families

### Bordered magic square

A magic square that remains magic, under a stated convention, after removing
one or more outer borders. The inner square need not remain normal.

### Concentric bordered magic square

A bordered magic square in which successive inner borders also produce magic
sub-squares.

### Inlaid magic square

A magic square containing one or more magic sub-squares. The outer square need
not be produced by removing borders.

### Composite magic square

A magic square constructed from smaller component squares or structured blocks.
The term describes construction history, not one universal property.

### Most-perfect magic square

Usually a normal, doubly-even-order pandiagonal square with two additional
properties: each `2×2` subsquare has the appropriate constant sum, and pairs of
entries separated by half the order along a diagonal are complementary. The
Lab records the two component properties separately.

### Franklin magic square

A family associated with Benjamin Franklin's unusual order-8 square and later
generalizations. Typical definitions include bent or broken diagonal sums,
half-row and half-column sums, and compactness. The exact Franklin conditions
must be specified for each claim.

### Ultra-magic square

Commonly a square that is both centrally complementary and pandiagonal. The
term is historical and should be accompanied by the two underlying tests.

### Multimagic square

A square that remains magic after each entry is raised to several powers. A
`k`-multimagic square satisfies the magic condition for powers `1` through `k`
using the same declared line set.

### Bimagic square

A 2-multimagic square: the original entries and their squares each form a
magic square under the declared line set.

### Trimagic square

A 3-multimagic square. The cubes of the entries must also satisfy the magic
condition.

### Square of squares

A square whose entries are distinct perfect squares and whose entries, as
written, satisfy the magic condition. This is different from a bimagic square:
the original roots need not themselves form a magic square.

### Magic square of cubes / powers

A square whose entries are distinct perfect cubes or higher powers and whose
entries satisfy the magic condition.

### Additive-multiplicative magic square

A square in which the designated lines have both a common sum and a common
product.

### Multiplication magic square

A square in which the designated lines have a common product rather than, or
in addition to, a common sum.

### Alphamagic square

A square whose values, when converted through a declared spelling or letter-
value system, produce another magic relationship. The encoding must be
specified; “alphamagic” is not self-defining.

### Prime magic square

A magic square whose entries are selected primes, usually distinct primes.
Normality does not apply unless separately defined for the prime set.

### Heterosquare

An array whose designated line sums are all different. It is the contrasting
concept to a magic square, but the line set must be stated.

### Antimagic square

A square whose designated line sums form a specified set of distinct values,
often consecutive values. Definitions vary, so the target sum set belongs in
the record.

## 7. Other magic figures

### Magic rectangle

An `a×b` rectangular array whose rows share one constant and whose columns
share another. If `a ≠ b`, the row and column constants are generally
different. Diagonals are not normally part of the definition.

### Magic star

A star-shaped arrangement in which each designated straight or geometric line
has a common sum. Several incompatible star layouts exist; the topology must
be recorded.

### Magic circle

A circular arrangement of values with designated arcs, diameters, or radial
groups sharing a common sum.

### Magic triangle

A triangular arrangement whose designated sides or lines have equal sums.

### Magic hexagon

A hexagonal arrangement with a specified set of straight lines sharing a common
sum. It is not simply a square with six sides; the cell topology is part of the
definition.

### Magic diamond

A diamond-shaped arrangement with declared rows, diagonals, or embedded
figures sharing a common sum.

### Magic sphere

A spherical or polyhedral arrangement of values with designated geometric
paths or faces satisfying a magic condition. The geometry and line set must be
provided with the object.

### Magic graph

A graph equipped with a labeling or weighting such that a declared collection
of vertex, edge, neighborhood, or path sums satisfy a common condition.

### Distance-magic labeling

A graph labeling with the integers `1` through the number of vertices such that
every vertex has the same sum of labels on its neighbors. This is related to,
but not identical with, a classical magic square.

### Group magic square

A square whose entries are elements of an algebraic group and whose line sums
are evaluated using the group operation rather than ordinary integer addition.

### Zero-sum group magic square

A group magic square whose common line sum is the group's identity element.
Existence can depend on the structure of the underlying Abelian group.

### Latin square

An array in which every symbol occurs once in each row and column. Latin
squares are often used as construction components but are not automatically
magic squares.

### Graeco-Latin square

The superposition of two orthogonal Latin squares. It can provide coordinates
or digit layers in a magic-square construction.

## 8. Construction and solving

### Construction method

A repeatable rule that maps parameters, seed data, or smaller objects to a
valid magic object.

### Generator

An algorithm that produces one or more valid objects, often from a family of
parameters.

### Solver

An algorithm that searches for an object satisfying a declared set of
constraints. A solver need not reveal a human-readable construction method.

### Siamese method / de la Loubère method

A classical stepwise construction for normal magic squares of odd order,
typically based on diagonal movement with a collision rule.

### Complementary-pair method

A construction strategy that places complementary values in coordinated cell
patterns so that line sums are forced.

### Latin-square construction

A construction that combines one or more Latin-square layers, often with
arithmetic weights, to create a magic square or hypercube.

### Modular construction

A construction expressed through modular arithmetic, often using coordinate
functions and residue classes. This is especially natural for higher-dimensional
hypercubes.

### Composite construction

A construction that combines smaller magic objects, digit layers, blocks, or
Kronecker-like products.

### Constraint model

A formal representation of the requirements using variables, domains, and
constraints. Common tools include integer linear programming, constraint
programming, SAT, and exact-cover search.

### Integer linear programming, or ILP

A constraint model in which variables and relationships are linear, with
integrality restrictions. Magic-square construction can be expressed as an ILP
but may become computationally expensive as order increases.

### Exact cover

A search formulation in which selected candidate placements must cover each
required condition exactly once. Algorithm X and dancing-links methods are
common implementations.

### Exhaustive search

A search that systematically examines every candidate in a declared finite
search space, usually after applying symmetry reductions and constraint
propagation.

### Heuristic search

A search that uses prioritization, optimization, randomness, local improvement,
or other strategies without guaranteeing that every candidate was examined.

### Construction proof

A proof that a stated construction always produces the claimed object for all
allowed parameter values.

### Certificate

Machine-readable evidence that an object satisfies its declared requirements,
such as all line sums, uniqueness checks, and the exact line-set definition.

### Conjecture

A proposed statement supported by evidence but not yet proven or disproven.

### Counterexample

An object that demonstrates a universal claim is false.

### Enumeration

Counting all objects in a specified class, usually after declaring which
equivalences are ignored.

### Classification

Organizing objects into meaningful classes based on properties, symmetries,
construction families, or invariants.

### Invariant

A quantity or structural property preserved by the allowed transformations.

### Family

A parameterized collection of objects produced by a common rule or sharing a
structural description.

### Rediscovery

An independently found object or method that is already known. Rediscoveries
remain valuable when they provide a clearer proof, a new representation, a
better algorithm, or a historically independent development.

### Novel construction

A construction method not found in the Lab's checked sources. This is a
provisional label until a literature and equivalence search has been completed.

### New object

An object not previously recorded in the relevant database under the declared
equivalence rules. A new object need not imply a new construction method.

## 9. Provenance and repository terms

### Provenance

The documented origin, author, date, source, transcription history, and
validation history of an object or claim.

### Source object

The historical or external item from which a Lab record was derived, such as a
book illustration, paper, webpage, email, or physical artifact.

### Transcription

The act of converting a source object into a structured digital representation.
Transcriptions should preserve uncertainty rather than silently correcting it.

### Reproduction

A digital recreation intended to match a source object. A reproduction is not
necessarily a new mathematical discovery.

### Derived work

An original explanation, visualization, implementation, or analysis based on a
source object. Derived work should cite the source and clearly distinguish the
new contribution.

### Validation status

A controlled label such as `unverified`, `digitized`, `verified`, `partially
verified`, `source-conflicted`, or `proof-verified`.

### Definition profile

A named bundle of rules specifying entry domain, normality, distinctness,
operation, line set, symmetry rules, and any extra constraints.

### Object record

The complete structured description of one object, including values, order,
dimension, definition profile, properties, provenance, transformations, and
validation certificate.

## 10. Recommended Lab language

Prefer:

- “magic under the rows, columns, and two principal diagonals” over simply
  “magic” when precision matters;
- “normal order-5 square” over “natural square”;
- “dimension-10 order-3 magic hypercube” over “10-dimensional magic cube”;
- “equivalent under `D4`” over “the same square”;
- “verified against 40 declared line families” over “perfect”;
- “independently rediscovered” over “new” until a source and equivalence search
  is complete.

Avoid using these words alone as claims:

- perfect;
- regular;
- symmetric;
- unique;
- novel;
- trivial;
- complete;
- natural.

## 11. Starting references

These sources informed the Lab's terminology map. They are references for
comparison, not templates to reproduce.

- Heinz, Harvey D., and John R. Hendricks. *Magic Square Lexicon: Illustrated*.
  Self-published, 2000; corrected second print run, July 2005. ISBN
  `0-9687985-0-0`. [Surviving book page and first-quarter sample](https://www.geocities.ws/harveyhd/BookSale.htm).
- Heinz, Harvey D. [Biographical sketch and archive references](https://www.multimagie.com/English/Heinz.htm).
- Weisstein, Eric W. [Magic Square](https://mathworld.wolfram.com/MagicSquare.html),
  [Magic Cube](https://mathworld.wolfram.com/MagicCube.html), and
  [Panmagic Square](https://mathworld.wolfram.com/PanmagicSquare.html).
- Hankin, Robin K. S. [The `magic` R package](https://cran.r-project.org/package=magic),
  including definitions for semimagic squares and high-dimensional hypercubes.
- Loly, Peter D. [Scientific Studies of Magic Squares](https://doi.org/10.25088/ComplexSystems.17.2.143144).
- Boyer, Christian. [Multimagic squares, cubes, and hypercubes](https://www.multimagie.com/English/indexengl.htm).
- Cichacz, Sylwia, and Dalibor Froncek. [Note on zero-sum magic squares on
  Abelian groups](https://arxiv.org/abs/2605.05181), 2026.
- Flores, Daniel. [A circle method approach to K-multimagic squares](https://arxiv.org/abs/2406.08161),
  and [Existence of K-multimagic squares and magic squares of kth powers with
  distinct entries](https://www.cambridge.org/core/journals/bulletin-of-the-australian-mathematical-society/article/existence-of-kmultimagic-squares-and-magic-squares-of-kth-powers-with-distinct-entries/96A7728688B5E865CF8E753A83E5FC1D), 2025.
- Rome, Nick, and Shuntaro Yamagishi. [On the existence of magic squares of
  powers](https://arxiv.org/abs/2406.09364), 2024/2025.
