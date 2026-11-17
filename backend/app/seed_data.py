import json
from sqlalchemy.orm import Session
from app.models.models import Question, MockTest, MockTestQuestion

def seed_database(db: Session):
    if db.query(MockTest).filter(
        MockTest.title == "Digital SAT Official Practice Test #1 (Diagnostic Exam)"
    ).first():
        print("Practice content already seeded.")
        return

    print("Seeding practice questions and mock tests...")

    # 2. SAT Questions Dataset (Curated realistic Digital SAT questions)
    raw_questions = [
        # --- MATH: ALGEBRA ---
        {
            "domain": "Math",
            "topic": "Algebra",
            "subtopic": "Linear Equations",
            "difficulty": "Easy",
            "question_type": "mcq",
            "prompt": "If 4x + 7 = 31, what is the value of 2x - 3?",
            "options": [
                {"id": "A", "text": "6"},
                {"id": "B", "text": "9"},
                {"id": "C", "text": "12"},
                {"id": "D", "text": "15"}
            ],
            "correct_answer": "B",
            "accepted_alternatives": [],
            "explanation": "First, solve for x: 4x = 31 - 7 => 4x = 24 => x = 6. Now substitute x = 6 into the expression: 2(6) - 3 = 12 - 3 = 9.",
            "tips": "Pay close attention to what the question asks for! It asks for 2x - 3, not just x."
        },
        {
            "domain": "Math",
            "topic": "Algebra",
            "subtopic": "Systems of Linear Equations",
            "difficulty": "Medium",
            "question_type": "spr",
            "prompt": "In the system of equations below:\n2x + y = 14\n3x - 2y = 7\nWhat is the value of x?",
            "options": [],
            "correct_answer": "5",
            "accepted_alternatives": ["5.0", "5"],
            "explanation": "Multiply the first equation by 2: 4x + 2y = 28. Add to the second equation: (4x + 2y) + (3x - 2y) = 28 + 7 => 7x = 35 => x = 5.",
            "tips": "For Student-Produced Responses (SPR), enter only the numeric value 5."
        },
        {
            "domain": "Math",
            "topic": "Algebra",
            "subtopic": "Linear Inequalities",
            "difficulty": "Hard",
            "question_type": "mcq",
            "prompt": "A landscaping company charges a flat equipment fee of $75 plus $32.50 per hour of labor. If a customer has a maximum budget of $400 for the project, what is the maximum whole number of hours of labor the company can provide without exceeding the budget?",
            "options": [
                {"id": "A", "text": "9"},
                {"id": "B", "text": "10"},
                {"id": "C", "text": "11"},
                {"id": "D", "text": "12"}
            ],
            "correct_answer": "B",
            "accepted_alternatives": [],
            "explanation": "Set up inequality: 75 + 32.50h <= 400. 32.50h <= 325. h <= 325 / 32.50 = 10. Therefore, the maximum whole number of hours is 10.",
            "tips": "Even if the answer had decimals like 10.8, you must round DOWN to 10 to not exceed the budget."
        },

        # --- MATH: ADVANCED MATH ---
        {
            "domain": "Math",
            "topic": "Advanced Math",
            "subtopic": "Quadratic Equations",
            "difficulty": "Medium",
            "question_type": "mcq",
            "prompt": "The quadratic function f is defined by f(x) = x² - 8x + 12. For what value of x does f(x) reach its minimum value?",
            "options": [
                {"id": "A", "text": "2"},
                {"id": "B", "text": "4"},
                {"id": "C", "text": "6"},
                {"id": "D", "text": "-4"}
            ],
            "correct_answer": "B",
            "accepted_alternatives": [],
            "explanation": "For any quadratic in standard form ax² + bx + c with a > 0, the minimum occurs at the vertex x = -b / (2a). Here, a = 1, b = -8. Thus, x = -(-8) / (2 * 1) = 8 / 2 = 4.",
            "tips": "You can also verify instantly on the Desmos calculator by plotting y = x² - 8x + 12 and tapping the vertex!"
        },
        {
            "domain": "Math",
            "topic": "Advanced Math",
            "subtopic": "Exponential Functions",
            "difficulty": "Hard",
            "question_type": "spr",
            "prompt": "A sample of radioactive isotope decays according to the formula N(t) = 800 * (1/2)^(t / 15), where t is time in hours. After how many hours will the remaining sample size be 50 grams?",
            "options": [],
            "correct_answer": "60",
            "accepted_alternatives": ["60.0", "60"],
            "explanation": "Set N(t) = 50: 50 = 800 * (1/2)^(t / 15). Divide by 800: 50/800 = 1/16 = (1/2)^4. Since (1/2)^4 = (1/2)^(t/15), we have t/15 = 4 => t = 60.",
            "tips": "Notice 800 -> 400 (15h) -> 200 (30h) -> 100 (45h) -> 50 (60h). Four half-lives = 4 * 15 = 60 hours."
        },
        {
            "domain": "Math",
            "topic": "Advanced Math",
            "subtopic": "Polynomials & Exponents",
            "difficulty": "Easy",
            "question_type": "spr",
            "prompt": "If 3^(2x - 1) = 243, what is the value of x?",
            "options": [],
            "correct_answer": "3",
            "accepted_alternatives": ["3.0", "3"],
            "explanation": "Express 243 as a power of 3: 243 = 3^5. Thus, 2x - 1 = 5 => 2x = 6 => x = 3.",
            "tips": "Memorize powers of 2 and 3 through 6 for quick Digital SAT wins."
        },

        # --- MATH: PROBLEM-SOLVING & DATA ANALYSIS ---
        {
            "domain": "Math",
            "topic": "Problem-Solving & Data Analysis",
            "subtopic": "Percentages & Ratios",
            "difficulty": "Medium",
            "question_type": "mcq",
            "prompt": "In a clinical study of 240 patients, 65% experienced symptom relief within 48 hours. How many patients experienced symptom relief?",
            "options": [
                {"id": "A", "text": "144"},
                {"id": "B", "text": "156"},
                {"id": "C", "text": "162"},
                {"id": "D", "text": "170"}
            ],
            "correct_answer": "B",
            "accepted_alternatives": [],
            "explanation": "Compute 65% of 240: 0.65 * 240 = 156.",
            "tips": "Use the Desmos calculator to multiply 0.65 * 240 directly."
        },
        {
            "domain": "Math",
            "topic": "Problem-Solving & Data Analysis",
            "subtopic": "Rate & Unit Conversion",
            "difficulty": "Hard",
            "question_type": "spr",
            "prompt": "A high-speed train travels at a constant speed of 180 kilometers per hour. How many meters does the train travel in 2.5 seconds?",
            "options": [],
            "correct_answer": "125",
            "accepted_alternatives": ["125.0", "125"],
            "explanation": "Convert km/h to m/s: 180 km/h = 180 * (1000 m / 3600 s) = 180 / 3.6 = 50 m/s. In 2.5 seconds, distance = speed * time = 50 * 2.5 = 125 meters.",
            "tips": "Quick rule: to convert from km/h to m/s, divide by 3.6."
        },

        # --- MATH: GEOMETRY & TRIGONOMETRY ---
        {
            "domain": "Math",
            "topic": "Geometry & Trigonometry",
            "subtopic": "Right Triangles & Trigonometry",
            "difficulty": "Medium",
            "question_type": "mcq",
            "prompt": "In right triangle ABC, angle C is 90 degrees. If sin(A) = 3/5, what is the value of cos(B)?",
            "options": [
                {"id": "A", "text": "3/5"},
                {"id": "B", "text": "4/5"},
                {"id": "C", "text": "3/4"},
                {"id": "D", "text": "5/3"}
            ],
            "correct_answer": "A",
            "accepted_alternatives": [],
            "explanation": "In any right triangle where C = 90°, angles A and B are complementary (A + B = 90°). By co-function identity, sin(A) = cos(90° - A) = cos(B). Since sin(A) = 3/5, cos(B) = 3/5.",
            "tips": "The SAT tests the complementary angle identity sin(x) = cos(90 - x) on virtually every test!"
        },
        {
            "domain": "Math",
            "topic": "Geometry & Trigonometry",
            "subtopic": "Circle Equations",
            "difficulty": "Hard",
            "question_type": "spr",
            "prompt": "In the xy-plane, the graph of x² + y² - 6x + 8y = 24 is a circle. What is the radius of this circle?",
            "options": [],
            "correct_answer": "7",
            "accepted_alternatives": ["7.0", "7"],
            "explanation": "Complete the square: (x² - 6x + 9) + (y² + 8y + 16) = 24 + 9 + 16 => (x - 3)² + (y + 4)² = 49. The radius is r = sqrt(49) = 7.",
            "tips": "Remember the standard circle equation: (x - h)² + (y - k)² = r²."
        },
        {
            "domain": "Math",
            "topic": "Geometry & Trigonometry",
            "subtopic": "Arc Length & Radians",
            "difficulty": "Hard",
            "question_type": "spr",
            "prompt": "A circle has a radius of 12 cm. What is the length, in centimeters, of an arc intercepted by a central angle of 1.5 radians?",
            "options": [],
            "correct_answer": "18",
            "accepted_alternatives": ["18.0", "18"],
            "explanation": "Arc length s = r * theta when theta is in radians. s = 12 * 1.5 = 18 cm.",
            "tips": "Formula: s = r * theta. If angle is given in radians, multiplication is instantaneous!"
        },

        # --- READING & WRITING: CRAFT & STRUCTURE ---
        {
            "domain": "Reading & Writing",
            "topic": "Craft & Structure",
            "subtopic": "Words in Context",
            "difficulty": "Medium",
            "question_type": "mcq",
            "passage": "Historically, ancient Mesoamerican city-states developed sophisticated agricultural terraces to maintain soil fertility and prevent erosion on steep slopes. Rather than causing depletion, this deliberate land cultivation proved surprisingly sustainable over many centuries.",
            "prompt": "As used in the text, what does the word 'deliberate' most nearly mean?",
            "options": [
                {"id": "A", "text": "Carefully planned and intentional"},
                {"id": "B", "text": "Slow and unhurried"},
                {"id": "C", "text": "Cautious and hesitant"},
                {"id": "D", "text": "Debated publicly"}
            ],
            "correct_answer": "A",
            "accepted_alternatives": [],
            "explanation": "In this context, 'deliberate land cultivation' describes intentional, well-engineered architectural terraces that were systematically planned to prevent erosion.",
            "tips": "Substitute each choice into the sentence to verify which best preserves the scientific tone and intended meaning."
        },
        {
            "domain": "Reading & Writing",
            "topic": "Craft & Structure",
            "subtopic": "Cross-Text Connections",
            "difficulty": "Hard",
            "question_type": "mcq",
            "passage": "Text 1: Biologist Thorne argues that urban green corridors primarily benefit generalist animal species capable of adapting quickly to human presence.\n\nText 2: Ecologist Vance's telemetry data demonstrated that several endangered bird species, traditionally classified as strict habitat specialists, regularly utilized forested overpasses and contiguous green corridors for seasonal migration.",
            "prompt": "Based on the texts, how would Vance (Text 2) most likely respond to Thorne's claim in Text 1?",
            "options": [
                {"id": "A", "text": "By agreeing that only generalists can migrate across modern cities"},
                {"id": "B", "text": "By pointing out that empirical tracking shows specialist species can also benefit from these corridors"},
                {"id": "C", "text": "By refuting that habitat loss is the primary driver of avian decline"},
                {"id": "D", "text": "By arguing that artificial overpasses are ineffective compared to natural reserves"}
            ],
            "correct_answer": "B",
            "accepted_alternatives": [],
            "explanation": "Text 2 directly presents telemetry tracking data proving that habitat specialist bird species also use urban corridors, qualifying or contradicting Thorne's narrow claim.",
            "tips": "Focus on the direct tension point between Text 1's claim ('primarily generalists') and Text 2's empirical evidence ('specialists also utilized')."
        },

        # --- READING & WRITING: INFORMATION & IDEAS ---
        {
            "domain": "Reading & Writing",
            "topic": "Information & Ideas",
            "subtopic": "Command of Evidence",
            "difficulty": "Medium",
            "question_type": "mcq",
            "passage": "Astronomers investigating exoplanet WASP-96b analyzed its atmospheric transmission spectrum during stellar transit. The spectral data revealed distinct absorption peaks at wavelengths of 1.15 and 1.4 microns, matching laboratory signatures of water vapor.",
            "prompt": "Which finding from the study, if true, best supports the researchers' conclusion that WASP-96b possesses an atmosphere containing water?",
            "options": [
                {"id": "A", "text": "The exoplanet is located in a binary star system"},
                {"id": "B", "text": "The absorption peaks observed during transit align specifically with known molecular spectra for H2O"},
                {"id": "C", "text": "The planet has a surface gravity roughly comparable to Jupiter"},
                {"id": "D", "text": "The telescope collected images across optical and infrared frequencies"}
            ],
            "correct_answer": "B",
            "accepted_alternatives": [],
            "explanation": "The conclusion relies on the spectral absorption peaks matching the molecular fingerprint of water vapor (H2O).",
            "tips": "Eliminate choices that are interesting facts but do not directly prove water presence."
        }
    ]

    saved_questions = []
    for q_data in raw_questions:
        q = Question(
            domain=q_data["domain"],
            topic=q_data["topic"],
            subtopic=q_data.get("subtopic"),
            difficulty=q_data["difficulty"],
            question_type=q_data["question_type"],
            prompt=q_data["prompt"],
            passage=q_data.get("passage"),
            options_json=json.dumps(q_data.get("options", [])),
            correct_answer=q_data["correct_answer"],
            accepted_alternatives_json=json.dumps(q_data.get("accepted_alternatives", [])),
            explanation=q_data["explanation"],
            tips=q_data.get("tips")
        )
        db.add(q)
        saved_questions.append(q)

    db.commit()
    for q in saved_questions:
        db.refresh(q)

    # 3. Create Official Mock Tests
    test1 = MockTest(
        title="Digital SAT Official Practice Test #1 (Diagnostic Exam)",
        description="Comprehensive adaptive-style test featuring Math and Reading & Writing modules with realistic Digital SAT timing, Desmos calculator, and Student-Produced Responses.",
        time_limit_minutes=45,
        is_active=True
    )
    test2 = MockTest(
        title="Digital SAT High-Yield Math Intensive Mock",
        description="Focused 100% on Math domains: Algebra, Advanced Math, Problem-Solving, and Geometry & Trig with mixed MCQ and Float/SPR questions.",
        time_limit_minutes=35,
        is_active=True
    )
    db.add_all([test1, test2])
    db.commit()
    db.refresh(test1)
    db.refresh(test2)

    # Associate questions with Mock Test 1
    order = 1
    for q in saved_questions:
        sec = "Math Module 1" if q.domain == "Math" else "Reading & Writing Module 1"
        mtq = MockTestQuestion(
            mock_test_id=test1.id,
            question_id=q.id,
            section_name=sec,
            order=order
        )
        db.add(mtq)
        order += 1

    # Associate Math questions with Mock Test 2
    order_m = 1
    for q in saved_questions:
        if q.domain == "Math":
            mtq = MockTestQuestion(
                mock_test_id=test2.id,
                question_id=q.id,
                section_name="Math Module 1",
                order=order_m
            )
            db.add(mtq)
            order_m += 1

    db.commit()

    db.commit()
    print("Practice content seeded successfully.")

