import React from 'react'
import { Highlighter, CenteredContainer, HeroContainer, HeroBg, HeroLeftContainer, Img, HeroRightContainer, HeroInnerContainer, TextLoop, Title, Span, SubTitle,SocialMediaIcons,SocialMediaIcon, ResumeButton } from './HeroStyle'
import Typewriter from 'typewriter-effect';
import { Bio } from '../../data/constants';


const HeroSection = () => {
    return (
        <div id="about">
            <HeroContainer>
                <HeroInnerContainer >
                    <HeroLeftContainer id="Left">
                        <Title>Hey, I'm {Bio.name}</Title>
                        <TextLoop>
                            a
                            <Span>
                                <Typewriter
                                    options={{
                                        strings: Bio.roles,
                                        autoStart: true,
                                        loop: true,
                                    }}
                                />
                            </Span>
                            with a passion for <Span>technology</Span> and <Span>fashion</Span>
                        </TextLoop>
                        <SubTitle>{Bio.description}</SubTitle>
                        <CenteredContainer>
                            <ResumeButton href={Bio.resume} target='display'>My Resume</ResumeButton>
                        </CenteredContainer>
                    </HeroLeftContainer>
                </HeroInnerContainer>
            </HeroContainer>
        </div>
    )
}

export default HeroSection